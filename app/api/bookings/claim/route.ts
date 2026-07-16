import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const token = request.cookies.get("fc_booking_claim")?.value;
  if (!token) return NextResponse.json({ error: "Il collegamento temporaneo è scaduto. La prenotazione resta comunque registrata." }, { status: 410 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accedi per collegare la prenotazione." }, { status: 401 });
  const { data, error } = await (supabase as any).rpc("claim_guest_booking", { p_token: token });
  if (error) {
    console.error("booking_claim_failed", { code: error.code });
    return NextResponse.json({ error: error.message.includes("email_mismatch") ? "Accedi con la stessa email verificata usata nella prenotazione." : "Collegamento non riuscito o scaduto." }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true, appointmentId: data });
  response.cookies.delete("fc_booking_claim");
  return response;
}
