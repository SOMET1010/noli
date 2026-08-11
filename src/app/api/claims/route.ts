import { db, mapRows } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth-guard";

const VALID_TYPES = ["ACCIDENT", "VOL", "BRIS_GLACE", "INCENDIE", "AUTRE"];

export async function GET() {
  try {
    const profile = await getSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { data, error } = await db
      .from("claims")
      .select(
        "id, reference, type, description, incident_date, status, created_at, " +
          "contract:contracts(reference, insurer:insurers(name), offer:insurance_offers(name))"
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ claims: mapRows(data as unknown as Record<string, unknown>[] | null) });
  } catch (error) {
    console.error("Erreur claims GET:", error);
    return NextResponse.json({ error: "Erreur lors du chargement des sinistres" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getSessionProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const body = await request.json();
    const contractId = Number(body.contractId);
    const type = String(body.type || "").toUpperCase();
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";

    if (!Number.isInteger(contractId) || contractId <= 0) {
      return NextResponse.json({ error: "Contrat invalide" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Type de sinistre invalide" }, { status: 400 });
    }
    if (description.length < 10) {
      return NextResponse.json({ error: "Merci de décrire le sinistre (au moins 10 caractères)." }, { status: 400 });
    }

    // Date facultative mais, si fournie, doit être une date valide (format AAAA-MM-JJ)
    // — sinon on renvoie un 400 propre plutôt qu'une erreur base (500).
    let incidentDate: string | null = null;
    if (typeof body.incidentDate === "string" && body.incidentDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.incidentDate) || Number.isNaN(new Date(body.incidentDate).getTime())) {
        return NextResponse.json({ error: "Date du sinistre invalide" }, { status: 400 });
      }
      incidentDate = body.incidentDate;
    }

    // Autorisation : le contrat doit appartenir au client.
    const { data: contract, error: cErr } = await db
      .from("contracts")
      .select("id, insurer_id, profile_id")
      .eq("id", contractId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contract || (contract as { profile_id: string }).profile_id !== profile.id) {
      return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
    }

    const reference = `NOLI-SIN-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 1e4)
      .toString()
      .padStart(4, "0")}`;

    const { error: insErr } = await db.from("claims").insert({
      reference,
      contract_id: contractId,
      profile_id: profile.id,
      insurer_id: (contract as { insurer_id: number }).insurer_id,
      type,
      description,
      incident_date: incidentDate,
      status: "SUBMITTED",
    });
    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, reference });
  } catch (error) {
    console.error("Erreur claims POST:", error);
    return NextResponse.json({ error: "Erreur lors de la déclaration du sinistre" }, { status: 500 });
  }
}
