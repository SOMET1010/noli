import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { db, mapRow } from '@/lib/db'
import { promises as fs } from 'fs'
import { logAudit } from '@/lib/audit'
import { resolveBackupPath } from '@/lib/backups'

async function findBackup(id: string) {
  const { data } = await db.from("backups").select("id, path, filename").eq("id", id).maybeSingle()
  return mapRow<{ id: string; path: string | null; filename: string }>(data)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuth(["ADMIN"]); if (guard) return guard;
    const { id } = await params

    const backup = await findBackup(id)
    if (!backup) {
      return NextResponse.json(
        { error: 'Sauvegarde non trouvée' },
        { status: 404 }
      )
    }

    // H-07 : le chemin est reconstruit depuis le nom de fichier relatif.
    const backupPath = resolveBackupPath(backup.filename, backup.path)
    try {
      await fs.access(backupPath)
    } catch {
      return NextResponse.json(
        { error: 'Fichier de sauvegarde introuvable sur le serveur' },
        { status: 404 }
      )
    }

    const content = await fs.readFile(backupPath)
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${backup.filename.replace(/"/g, '')}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors du téléchargement de la sauvegarde:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement de la sauvegarde' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuth(["ADMIN"]); if (guard) return guard;
    const { id } = await params

    const backup = await findBackup(id)

    if (!backup) {
      return NextResponse.json(
        { error: 'Sauvegarde non trouvée' },
        { status: 404 }
      )
    }

    const backupPath = resolveBackupPath(backup.filename, backup.path)
    try {
      await fs.unlink(backupPath)
    } catch {
      // Le fichier peut ne plus exister
    }

    const { error } = await db.from("backups").delete().eq("id", id)
    if (error) throw error

    await logAudit({
      action: 'BACKUP_DELETE',
      entity: 'Backup',
      entityId: id,
      details: { filename: backup.filename },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de la sauvegarde:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la sauvegarde' },
      { status: 500 }
    )
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(["ADMIN"]); if (guard) return guard;
  await params
  // La base de production est hébergée sur Supabase/PostgreSQL. La restauration
  // d'un export logique JSON par-dessus la base vivante est une opération
  // sensible (dépendances entre tables, séquences, RLS) qui ne doit pas être
  // déclenchée depuis l'interface d'administration. Elle se fait côté
  // infrastructure (voir docs/SAUVEGARDE_DR.md). On renvoie donc un message
  // explicite plutôt qu'une fausse réussite.
  return NextResponse.json(
    {
      error:
        "Restauration non disponible depuis l'interface. La base est hébergée sur Supabase : " +
        "la restauration s'effectue au niveau de l'infrastructure (voir la procédure de reprise). " +
        "Vous pouvez néanmoins télécharger l'export pour le conserver hors ligne.",
    },
    { status: 501 }
  )
}
