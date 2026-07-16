import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const { data, error } = await supabase.from("appointments")
    .select("id,service_id,location_id,starts_at,ends_at,status,client_notes,services(name,duration_minutes),locations(name,mode)")
    .order("starts_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Appuntamenti non disponibili." }, { status: 400 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; startsAt?: string } | null;
  if (!body?.id || !body.startsAt || Number.isNaN(new Date(body.startsAt).getTime())) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  const { error } = await supabase.rpc("reschedule_own_appointment", { p_appointment_id: body.id, p_starts_at: new Date(body.startsAt).toISOString() });
  if (error) return NextResponse.json({ error: "Spostamento non consentito o slot non più disponibile." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; reason?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Appuntamento mancante." }, { status: 400 });
  const { error } = await supabase.rpc("cancel_own_appointment", { p_appointment_id: body.id, p_reason: body.reason || null });
  if (error) return NextResponse.json({ error: "Il limite per la cancellazione è scaduto." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
