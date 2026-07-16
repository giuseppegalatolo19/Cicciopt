import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const isClientRoute = pathname === "/cliente" || pathname.startsWith("/cliente/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isMfaRoute = pathname === "/mfa";

  if (!url || !key || key === "your_supabase_anon_key") {
    if (isClientRoute || isAdminRoute || isMfaRoute) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set("error", "Configurazione Supabase incompleta.");
      return NextResponse.redirect(login);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if ((isClientRoute || isAdminRoute || isMfaRoute) && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if ((isAdminRoute || isMfaRoute) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || !profile.is_active) {
      const denied = request.nextUrl.clone();
      denied.pathname = "/cliente";
      denied.search = "";
      return NextResponse.redirect(denied);
    }
    if (isAdminRoute) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") {
        const mfa = request.nextUrl.clone();
        mfa.pathname = "/mfa";
        mfa.search = "";
        return NextResponse.redirect(mfa);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/cliente/:path*", "/admin/:path*", "/mfa", "/login", "/registrazione", "/recupera-password", "/reset-password", "/aggiorna-password"],
};
