import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  return profile?.role === "admin" && profile.is_active ? { supabase, user } : null;
}

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { data, error } = await (admin.supabase as any).from("clients").select("id,profile_id,first_name,last_name,email,phone,birth_date,admin_notes,associated_service_id,account_status,primary_goal,next_action,created_at,profiles(id,email,first_name,last_name,phone),services(name)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Clienti non disponibili." }, { status: 400 });
  const clients = (data ?? []).map((item: any) => ({ ...item, display_first_name: item.profiles?.first_name || item.first_name || "", display_last_name: item.profiles?.last_name || item.last_name || "", display_email: item.profiles?.email || item.email || item.invited_email || "", display_phone: item.profiles?.phone || item.phone || "" }));
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as { firstName?: string; lastName?: string; email?: string; phone?: string; birthDate?: string; adminNotes?: string; serviceId?: string; primaryGoal?: string } | null;
  const firstName = body?.firstName?.trim() ?? "";
  const lastName = body?.lastName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!firstName || !lastName || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return NextResponse.json({ error: "Nome, cognome o email non validi." }, { status: 400 });
  const db = admin.supabase as any;
  if (email) {
    const [{ data: byEmail }, { data: byInvite }] = await Promise.all([db.from("clients").select("id").eq("email", email).limit(1), db.from("clients").select("id").eq("invited_email", email).limit(1)]);
    if (byEmail?.length || byInvite?.length) return NextResponse.json({ error: "Esiste già un cliente con questa email." }, { status: 409 });
  }
  const { data, error } = await db.from("clients").insert({ first_name: firstName.slice(0, 80), last_name: lastName.slice(0, 80), email: email || null, invited_email: email || null, phone: body?.phone?.trim().slice(0, 40) || null, birth_date: body?.birthDate || null, admin_notes: body?.adminNotes?.trim().slice(0, 4000) || null, associated_service_id: body?.serviceId || null, primary_goal: body?.primaryGoal?.trim().slice(0, 500) || null, account_status: "invited", next_action: email ? "Invitare alla registrazione" : "Completare i contatti" }).select("id").single();
  if (error) return NextResponse.json({ error: "Creazione cliente non riuscita." }, { status: 400 });
  await db.from("activity_logs").insert({ actor_id: admin.user.id, client_id: data.id, action: "manual_client_created", entity_type: "client", entity_id: data.id });
  return NextResponse.json({ ok: true, clientId: data.id }, { status: 201 });
}
