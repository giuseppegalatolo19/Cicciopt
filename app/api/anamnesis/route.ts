import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { hasValidOrigin } from "@/lib/security";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single();
  if (!client) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 404 });
  const { data: anamnesis } = await supabase.from("anamneses").select("id,status,completion_percent,updated_at").eq("client_id", client.id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!anamnesis) return NextResponse.json({ anamnesis: null, sections: {}, consents: [] });
  const [{ data: answers }, { data: consents }] = await Promise.all([
    supabase.from("anamnesis_answers").select("section,question_key,answer").eq("anamnesis_id", anamnesis.id),
    supabase.from("consents").select("consent_type,document_version,granted,granted_at,revoked_at").eq("client_id", client.id).order("granted_at", { ascending: false }),
  ]);
  const sections: Record<string, Record<string, Json>> = {};
  answers?.forEach((answer) => { (sections[answer.section] ||= {})[answer.question_key] = answer.answer; });
  return NextResponse.json({ anamnesis, sections, consents: consents ?? [] });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const body = await request.json().catch(() => null) as { sections?: Json; completionPercent?: number; submit?: boolean; consents?: Json } | null;
  if (!body?.sections || typeof body.completionPercent !== "number") return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  const { data, error } = await supabase.rpc("save_anamnesis", {
    p_sections: body.sections,
    p_completion_percent: Math.max(0, Math.min(100, Math.round(body.completionPercent))),
    p_submit: Boolean(body.submit),
    p_consents: body.consents ?? [],
  });
  if (error) return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 400 });
  return NextResponse.json({ ok: true, anamnesisId: data });
}
