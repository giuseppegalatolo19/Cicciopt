import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from("profiles").select("id,email,first_name,last_name,phone,role,is_active,created_at").eq("id", user.id).single(),
    supabase.from("clients").select("id,account_status,primary_goal,next_action,created_at").eq("profile_id", user.id).maybeSingle(),
  ]);
  return NextResponse.json({ user: { id: user.id, email: user.email }, profile, client });
}

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const body = await request.json().catch(() => null) as { firstName?: string; lastName?: string; phone?: string } | null;
  if (!body?.firstName?.trim() || !body.lastName?.trim()) {
    return NextResponse.json({ error: "Nome e cognome sono obbligatori." }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").update({
    first_name: body.firstName.trim().slice(0, 80),
    last_name: body.lastName.trim().slice(0, 80),
    phone: body.phone?.trim().slice(0, 30) || null,
  }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Aggiornamento non riuscito." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
