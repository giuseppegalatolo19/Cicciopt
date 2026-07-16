import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";
import { sendBookingAdminEmail } from "@/lib/email";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { hasValidOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  const supabase = createPublicServerClient();
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  const locationId = request.nextUrl.searchParams.get("locationId");
  const day = request.nextUrl.searchParams.get("day");
  if (serviceId && locationId && day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
    const { data, error } = await supabase.rpc("get_available_slots", { p_service_id: serviceId, p_location_id: locationId, p_day: day });
    if (error) return NextResponse.json({ error: "Disponibilità non raggiungibile." }, { status: 500 });
    return NextResponse.json({ slots: data ?? [], timezone: "Europe/Rome" });
  }
  const [{ data: services, error: serviceError }, { data: locations, error: locationError }, { data: links }] = await Promise.all([
    (supabase.from("services") as any).select("id,name,slug,short_description,duration_minutes,buffer_minutes,manual_approval,display_order").eq("is_active", true).eq("bookable_online", true).order("display_order").order("name"),
    supabase.from("locations").select("id,name,slug,address,city,mode").eq("is_active", true).order("name"),
    supabase.from("service_locations").select("service_id,location_id"),
  ]);
  if (serviceError || locationError) {
    console.error("booking_catalog_failed", { serviceCode: serviceError?.code ?? null, serviceMessage: serviceError?.message ?? null, locationCode: locationError?.code ?? null, locationMessage: locationError?.message ?? null });
    return NextResponse.json({ error: "Catalogo non raggiungibile." }, { status: 500 });
  }
  return NextResponse.json({ services: services ?? [], locations: locations ?? [], serviceLocations: links ?? [] });
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`booking:${ip}`, 8, 15 * 60_000)) return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ error: "Invio non valido." }, { status: 400 });
  if (!body || typeof body.serviceId !== "string" || typeof body.locationId !== "string" || typeof body.startsAt !== "string" || typeof body.email !== "string" || typeof body.firstName !== "string" || typeof body.lastName !== "string") {
    return NextResponse.json({ error: "Dati della prenotazione incompleti." }, { status: 400 });
  }
  const firstName = body.firstName.trim().slice(0, 80);
  const lastName = body.lastName.trim().slice(0, 80);
  const email = body.email.trim().toLowerCase().slice(0, 254);
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Inserisci nome, cognome ed email validi." }, { status: 400 });
  }
  if (body.privacyAccepted !== true || body.termsAccepted !== true) {
    return NextResponse.json({ error: "Per prenotare devi accettare privacy policy e regolamento." }, { status: 400 });
  }
  const startsAt = new Date(body.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
  const supabase = createPublicServerClient();
  const { data, error } = await (supabase as any).rpc("create_public_booking_v2", {
    p_service_id: body.serviceId, p_location_id: body.locationId, p_starts_at: startsAt.toISOString(),
    p_first_name: firstName, p_last_name: lastName,
    p_email: email,
    p_phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "",
    p_notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || null : null,
  });
  if (error) {
    const unavailable = error.message.includes("slot_unavailable") || error.code === "23P01";
    return NextResponse.json({ error: unavailable ? "L’orario non è più disponibile." : "Prenotazione non riuscita." }, { status: unavailable ? 409 : 400 });
  }
  const [{ data: service }, { data: location }] = await Promise.all([
    supabase.from("services").select("name").eq("id", body.serviceId).maybeSingle(),
    supabase.from("locations").select("name").eq("id", body.locationId).maybeSingle(),
  ]);
  const notificationStatus = await sendBookingAdminEmail({
    firstName,
    lastName,
    email,
    phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "",
    serviceName: service?.name || "Servizio prenotato",
    locationName: location?.name || "Modalità da concordare",
    startsAt,
    bookingId: data.appointment_id,
  });
  const response = NextResponse.json({ ok: true, bookingId: data.appointment_id, notificationStatus, claimAvailable: true }, { status: 201 });
  response.cookies.set("fc_booking_claim", data.claim_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60, path: "/" });
  return response;
}
