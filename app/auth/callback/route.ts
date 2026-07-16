import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safePath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/cliente";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safePath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  const login = new URL("/login", requestUrl.origin);
  login.searchParams.set("error", "Il link non è valido o è scaduto.");
  return NextResponse.redirect(login);
}
