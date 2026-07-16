import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/rate-limit";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { hasValidOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(`contact:${ip}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, status: "new" }, { status: 201 });
  }
  if (!body || typeof body.firstName !== "string" || typeof body.lastName !== "string" || typeof body.email !== "string" || body.privacy !== "on" || body.contactConsent !== "on") {
    return NextResponse.json({ error: "Controlla i campi obbligatori e i consensi." }, { status: 400 });
  }
  const firstName = body.firstName.trim().slice(0, 80);
  const lastName = body.lastName.trim().slice(0, 80);
  const email = body.email.trim().toLowerCase().slice(0, 254);
  if (!firstName || !lastName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Nome, cognome o email non validi." }, { status: 400 });
  }
  const supabase = createPublicServerClient();
  const { error } = await supabase.rpc("create_public_inquiry", {
    p_first_name: firstName, p_last_name: lastName, p_email: email,
    p_phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 30) : "",
    p_service: typeof body.service === "string" ? body.service.slice(0, 120) : "",
    p_goal: typeof body.goal === "string" ? body.goal.slice(0, 200) : "",
    p_mode: typeof body.mode === "string" ? body.mode.slice(0, 80) : "",
    p_time: typeof body.time === "string" ? body.time.slice(0, 80) : "",
    p_message: typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "",
  });
  if (error) return NextResponse.json({ error: "Non è stato possibile registrare la richiesta." }, { status: 500 });
  return NextResponse.json({ ok: true, status: "new" }, { status: 201 });
}
