import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";
import { getServerSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!allowRequest(`booking:${ip}`, 8, 15 * 60_000)) return NextResponse.json({ error: "Troppe richieste." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !body.service || !body.dateIso || !body.time || typeof body.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "Dati della prenotazione incompleti." }, { status: 400 });
  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase.rpc("create_public_booking", {
      p_service_name: body.service,
      p_location_name: body.mode,
      p_starts_at: new Date(`${body.dateIso}T${body.time}:00+02:00`).toISOString(),
      p_first_name: body.firstName,
      p_last_name: body.lastName,
      p_email: body.email,
      p_phone: body.phone,
      p_notes: body.notes || null,
    });
    if (error) return NextResponse.json({ error: error.code === "23P01" ? "L’orario non è più disponibile." : "Prenotazione non riuscita." }, { status: error.code === "23P01" ? 409 : 500 });
    return NextResponse.json({ ok: true, booking: data }, { status: 201 });
  }
  return NextResponse.json({ ok: true, bookingCode: "FC-DEMO-2048", demo: true }, { status: 201 });
}
