import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";
import { getServerSupabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  if (!allowRequest(`contact:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || !body.email.includes("@") || body.privacy !== "on" || body.contactConsent !== "on") {
    return NextResponse.json({ error: "Controlla i campi obbligatori e i consensi." }, { status: 400 });
  }
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from("inquiries").insert({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone || null,
      service_interest: body.service || null,
      primary_goal: body.goal || null,
      preferred_mode: body.mode || null,
      preferred_time: body.time || null,
      message: body.message || null,
      status: "new",
      privacy_consent: true,
      contact_consent: true,
    });
    if (error) return NextResponse.json({ error: "Non è stato possibile registrare la richiesta." }, { status: 500 });
  }
  // In demo mode the browser stores a local copy; production persists to Supabase above.
  return NextResponse.json({ ok: true, status: "new", demo: !supabase }, { status: 201 });
}
