import { NextRequest, NextResponse } from 'next/server'
import { db, mapRow, mapRows } from '@/lib/db'
import { promises as fs } from 'fs'
import { join } from 'path'
import { requireAuth } from '@/lib/auth-guard'
import { logAudit } from '@/lib/audit'
import { BACKUPS_DIR } from '@/lib/backups'

/**
 * Tables métier exportées dans une sauvegarde logique.
 * L'application tourne sur Supabase/PostgreSQL : il n'existe pas de fichier de
 * base « local » à copier. On produit donc un export logique JSON, table par
 * table, via la clé service-role. Une table absente (migration non encore
 * appliquée) est ignorée sans faire échouer l'export.
 */
const EXPORT_TABLES = [
  'roles', 'permissions', 'role_permissions', 'profile_roles',
  'profiles', 'insurers', 'insurer_accounts',
  'insurance_categories', 'insurance_offers', 'insurance_packages', 'package_coverages',
  'coverage_categories', 'coverages', 'coverage_tariff_rules',
  'quotes', 'contracts', 'claims', 'reviews', 'notifications',
  'system_settings', 'audit_logs',
] as const

async function upsertSetting(key: string, value: string, category: string, label: string, type: string) {
  const { data: existing } = await db
    .from("system_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle()
  if (existing) {
    const { error } = await db.from("system_settings").update({ value }).eq("key", key)
    if (error) throw error
  } else {
    const { error } = await db.from("system_settings").insert({ key, value, category, label, type })
    if (error) throw error
  }
}

/**
 * Crée une sauvegarde logique (export JSON des tables métier) et l'enregistre
 * dans la table `backups`. Renvoie la ligne créée (mappée camelCase).
 */
async function createLogicalBackup(type: 'MANUAL' | 'SCHEDULED') {
  await fs.mkdir(BACKUPS_DIR, { recursive: true })

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const filename = `export_${timestamp}.json`
  const destPath = join(BACKUPS_DIR, filename)

  const tables: Record<string, unknown[]> = {}
  const skipped: { table: string; reason: string }[] = []
  for (const table of EXPORT_TABLES) {
    const { data, error } = await db.from(table).select('*')
    if (error) {
      // Table absente ou inaccessible : on l'ignore sans casser l'export.
      skipped.push({ table, reason: error.message })
      continue
    }
    tables[table] = data ?? []
  }

  const payload = {
    meta: {
      application: 'NOLI',
      format: 'logical-json',
      version: 1,
      createdAt: now.toISOString(),
      tables: Object.keys(tables),
      skipped,
      counts: Object.fromEntries(Object.entries(tables).map(([t, rows]) => [t, rows.length])),
    },
    data: tables,
  }

  const json = JSON.stringify(payload, null, 2)
  await fs.writeFile(destPath, json, 'utf8')
  const fileSize = Buffer.byteLength(json, 'utf8')

  // H-07 : on stocke le nom de fichier relatif, pas le chemin absolu.
  const { data: backupData, error } = await db
    .from("backups")
    .insert({
      filename,
      file_size: fileSize,
      status: 'COMPLETED',
      type,
      path: filename,
    })
    .select("id, filename, file_size, status, type, created_at")
    .single()
  if (error) throw error
  const backup = mapRow(backupData)

  await logAudit({
    action: 'BACKUP_CREATE',
    entity: 'Backup',
    entityId: backup!.id,
    details: { filename, fileSize, type, tables: Object.keys(tables).length, skipped: skipped.length },
  })

  return backup
}

/**
 * Calcule la prochaine exécution planifiée à partir d'une config.
 * `time` au format "HH:MM". `dayOfWeek` : 0-6 (hebdo) ou 1-28 (mensuel, jour du mois).
 */
function computeNextExecution(schedule: {
  enabled?: boolean
  frequency?: string
  time?: string
  dayOfWeek?: string
} | null): string | null {
  if (!schedule?.enabled) return null
  const [h, m] = (schedule.time || '02:00').split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return null

  const now = new Date()
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(h, m, 0, 0)

  if (schedule.frequency === 'weekly') {
    const target = parseInt(schedule.dayOfWeek || '1', 10)
    let delta = (target - next.getDay() + 7) % 7
    if (delta === 0 && next <= now) delta = 7
    next.setDate(next.getDate() + delta)
  } else if (schedule.frequency === 'monthly') {
    const day = Math.min(Math.max(parseInt(schedule.dayOfWeek || '1', 10), 1), 28)
    next.setDate(day)
    if (next <= now) next.setMonth(next.getMonth() + 1)
  } else {
    // daily
    if (next <= now) next.setDate(next.getDate() + 1)
  }
  return next.toISOString()
}

/**
 * Exécution planifiée « best-effort » : sans cron externe, on déclenche la
 * sauvegarde due lorsqu'une requête arrive après l'heure planifiée. Idempotent
 * grâce à `backup_last_auto` (une seule sauvegarde par créneau). Ne lève jamais.
 */
async function maybeRunScheduledBackup(schedule: {
  enabled?: boolean
  frequency?: string
  time?: string
  dayOfWeek?: string
} | null): Promise<boolean> {
  try {
    if (!schedule?.enabled) return false
    const [h, m] = (schedule.time || '02:00').split(':').map((n) => parseInt(n, 10))
    if (Number.isNaN(h) || Number.isNaN(m)) return false

    const now = new Date()
    // Créneau planifié pour aujourd'hui.
    const slot = new Date(now)
    slot.setHours(h, m, 0, 0)
    if (now < slot) return false // pas encore l'heure aujourd'hui

    // Respecte le jour (hebdo / mensuel).
    if (schedule.frequency === 'weekly' && now.getDay() !== parseInt(schedule.dayOfWeek || '1', 10)) return false
    if (schedule.frequency === 'monthly' && now.getDate() !== Math.min(Math.max(parseInt(schedule.dayOfWeek || '1', 10), 1), 28)) return false

    // Déjà exécutée pour ce créneau ?
    const { data: last } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "backup_last_auto")
      .maybeSingle()
    if (last?.value) {
      const lastRun = new Date(last.value)
      if (!Number.isNaN(lastRun.getTime()) && lastRun >= slot) return false
    }

    await createLogicalBackup('SCHEDULED')
    await upsertSetting('backup_last_auto', now.toISOString(), 'general', 'Dernière sauvegarde automatique', 'string')
    return true
  } catch (e) {
    console.error('Sauvegarde planifiée (best-effort) échouée:', e)
    return false
  }
}

export async function GET() {
  const guard = await requireAuth(["ADMIN"]); if (guard) return guard;
  try {
    // Planification enregistrée.
    let schedule: {
      enabled?: boolean
      frequency?: string
      time?: string
      dayOfWeek?: string
      nextExecution?: string
    } | null = null
    const { data: scheduleSetting } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "backup_schedule")
      .maybeSingle()
    if (scheduleSetting?.value) {
      try {
        schedule = JSON.parse(scheduleSetting.value)
      } catch {
        schedule = null
      }
    }

    // Déclenche une éventuelle sauvegarde planifiée due (best-effort, sans cron).
    await maybeRunScheduledBackup(schedule)

    if (schedule) {
      schedule = { ...schedule, nextExecution: computeNextExecution(schedule) ?? undefined }
    }

    const { data, error } = await db
      .from("backups")
      .select("id, filename, file_size, status, type, created_at")
      .order("created_at", { ascending: false })
    if (error) throw error

    // H-07 : ne jamais renvoyer le chemin serveur absolu.
    const backups = mapRows(data || []).map((b: Record<string, unknown>) => {
      const { path: _path, ...rest } = b
      return rest
    })

    return NextResponse.json({ backups, schedule })
  } catch (error) {
    console.error('Erreur lors de la récupération des sauvegardes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sauvegardes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireAuth(["ADMIN"]); if (guard) return guard;
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'schedule') {
      const body = await request.json()
      const { schedule, enabled } = body

      if (schedule === undefined || enabled === undefined) {
        return NextResponse.json(
          { error: 'Schedule et enabled sont requis' },
          { status: 400 }
        )
      }

      await Promise.all([
        upsertSetting('backup_schedule', JSON.stringify(schedule), 'general', 'Planification sauvegarde', 'json'),
        upsertSetting('backup_enabled', String(enabled), 'general', 'Sauvegarde automatique activée', 'boolean'),
      ])

      await logAudit({
        action: 'SETTINGS_CHANGE',
        entity: 'Backup',
        details: { schedule, enabled },
      })

      return NextResponse.json({ success: true, nextExecution: computeNextExecution({ ...schedule, enabled }) })
    }

    // Action par défaut : créer une sauvegarde logique (export JSON).
    const backup = await createLogicalBackup('MANUAL')
    return NextResponse.json({ backup }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de la sauvegarde:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la sauvegarde' },
      { status: 500 }
    )
  }
}
