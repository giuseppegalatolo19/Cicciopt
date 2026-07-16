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
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const { data, error } = await (admin.supabase as any).from("services").select("id,name,slug,short_description,full_description,duration_minutes,buffer_minutes,image_path,mode,icon_name,display_order,is_active,bookable_online,manual_approval,questionnaire_required,max_participants").order("display_order").order("name");
  if (error) return NextResponse.json({ error: "Servizi non disponibili." }, { status: 400 });
  return NextResponse.json({ services: data ?? [] });
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  const shortDescription = String(body?.shortDescription ?? "").trim();
  const duration = Number(body?.durationMinutes ?? 60);
  if (!name || !shortDescription || duration < 15 || duration > 240) return NextResponse.json({ error: "Compila nome, descrizione e durata valida." }, { status: 400 });
  const db = admin.supabase as any;
  const { data: last } = await db.from("services").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("services").insert({ name: name.slice(0, 120), slug: slugify(name), short_description: shortDescription.slice(0, 500), full_description: String(body?.fullDescription ?? "").trim().slice(0, 5000) || null, duration_minutes: duration, buffer_minutes: Number(body?.bufferMinutes ?? 15), mode: String(body?.mode ?? "Online / domicilio / palestra del cliente").trim().slice(0, 200), image_path: String(body?.imagePath ?? "").trim().slice(0, 500) || null, icon_name: String(body?.iconName ?? "").trim().slice(0, 60) || null, display_order: Number(last?.display_order ?? 0) + 1, is_active: Boolean(body?.isActive ?? true), bookable_online: Boolean(body?.bookableOnline ?? true), manual_approval: Boolean(body?.manualApproval ?? true) }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Nome o indirizzo del servizio già presente." : "Creazione non riuscita." }, { status: 400 });
  await db.from("activity_logs").insert({ actor_id: admin.user.id, action: "service_created", entity_type: "service", entity_id: data.id });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });
  const allowed: Record<string, string> = { name: "name", shortDescription: "short_description", fullDescription: "full_description", durationMinutes: "duration_minutes", bufferMinutes: "buffer_minutes", mode: "mode", imagePath: "image_path", iconName: "icon_name", displayOrder: "display_order", isActive: "is_active", bookableOnline: "bookable_online", manualApproval: "manual_approval" };
  const update: Record<string, unknown> = {};
  for (const [input, column] of Object.entries(allowed)) if (body?.[input] !== undefined) update[column] = typeof body[input] === "string" ? String(body[input]).trim() : body[input];
  if (typeof update.name === "string") update.slug = slugify(update.name);
  const db = admin.supabase as any;
  const { error } = await db.from("services").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Nome o indirizzo già in uso." : "Aggiornamento non riuscito." }, { status: 400 });
  await db.from("activity_logs").insert({ actor_id: admin.user.id, action: "service_updated", entity_type: "service", entity_id: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Servizio non valido." }, { status: 400 });
  const db = admin.supabase as any;
  const { error } = await db.from("services").delete().eq("id", body.id);
  if (error) {
    const { error: archiveError } = await db.from("services").update({ is_active: false, bookable_online: false }).eq("id", body.id);
    if (archiveError) return NextResponse.json({ error: "Eliminazione o disattivazione non riuscita." }, { status: 400 });
    return NextResponse.json({ ok: true, archived: true, message: "Servizio usato nello storico: è stato disattivato invece di essere eliminato." });
  }
  return NextResponse.json({ ok: true });
}
