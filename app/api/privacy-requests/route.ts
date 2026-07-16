import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const body = await request.json().catch(() => null) as { type?: string; details?: string } | null;
  if (!body?.type || !["export","rectification","erasure"].includes(body.type)) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  const { error } = await supabase.from("privacy_requests").insert({ profile_id: user.id, request_type: body.type, details: body.details?.slice(0, 1000) || null });
  if (error) return NextResponse.json({ error: "Richiesta non registrata." }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
