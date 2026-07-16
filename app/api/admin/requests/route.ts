import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  return data?.role === "admin" && data.is_active ? supabase : null;
}

export async function GET() {
  const supabase = await adminClient();
  if (!supabase) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { data, error } = await supabase.from("inquiries").select("id,first_name,last_name,email,phone,service_interest,status,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Richieste non disponibili." }, { status: 400 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await adminClient();
  if (!supabase) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  const allowed = ["new","to_contact","contacted","consultation_booked","converted","not_interested","archived"];
  if (!body?.id || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  const { error } = await supabase.from("inquiries").update({ status: body.status }).eq("id", body.id);
  if (error) return NextResponse.json({ error: "Aggiornamento non riuscito." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
