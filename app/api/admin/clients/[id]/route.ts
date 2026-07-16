import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  return data?.role === "admin" && data.is_active ? { supabase, user } : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorized();
  if (!auth) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { id } = await params;
  const { supabase } = auth;
  const [{ data: client, error }, { data: appointments }, { data: anamneses }, { data: documents }, { data: consents }, { data: notes }] = await Promise.all([
    supabase.from("clients").select("id,account_status,primary_goal,next_action,created_at,profiles(id,email,first_name,last_name,phone)").eq("id", id).single(),
    supabase.from("appointments").select("id,starts_at,ends_at,status,services(name)").eq("client_id", id).order("starts_at", { ascending: false }).limit(20),
    supabase.from("anamneses").select("id,status,completion_percent,updated_at,anamnesis_answers(section,question_key,answer,is_health_data)").eq("client_id", id).order("version", { ascending: false }).limit(1),
    supabase.from("documents").select("id,title,kind,expires_at,created_at,is_visible_to_client").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("consents").select("id,consent_type,document_version,granted,granted_at,revoked_at").eq("client_id", id).order("granted_at", { ascending: false }),
    supabase.from("admin_notes").select("id,body,created_at,author_id").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
  return NextResponse.json({ client, appointments, anamnesis: anamneses?.[0] ?? null, documents, consents, notes });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const auth = await authorized();
  if (!auth) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { note?: string } | null;
  if (!body?.note?.trim()) return NextResponse.json({ error: "Nota vuota." }, { status: 400 });
  const { error } = await auth.supabase.from("admin_notes").insert({ client_id: id, author_id: auth.user.id, body: body.note.trim().slice(0, 4000) });
  if (error) return NextResponse.json({ error: "Salvataggio non riuscito." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
