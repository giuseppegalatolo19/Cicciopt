import { NextRequest, NextResponse } from "next/server";

const actions = new Set(["login", "register", "recovery", "password_update"]);
const phases = new Set(["start", "success", "error"]);
const buckets = new Map<string, { count: number; resetAt: number }>();

function allowRequest(request: NextRequest) {
  const now = Date.now();
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= 60) return false;
  bucket.count += 1;
  return true;
}

function isSameSiteOrigin(request: NextRequest, origin: string) {
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = request.headers.get("host")?.trim();
    const configuredHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : undefined;
    return [forwardedHost, requestHost, configuredHost, request.nextUrl.host]
      .filter(Boolean)
      .includes(originHost);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isSameSiteOrigin(request, origin)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!allowRequest(request)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const phase = typeof body?.phase === "string" ? body.phase : "";
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const errorCode = typeof body?.errorCode === "string" && /^[a-z0-9_-]{1,80}$/i.test(body.errorCode) ? body.errorCode : undefined;
  if (!actions.has(action) || !phases.has(phase) || !/^[a-z0-9-]{8,80}$/i.test(requestId)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Non registrare email, password, token, URL di recupero o altri dati personali.
  console.info("[auth-diagnostic]", { action, phase, requestId, ...(errorCode ? { errorCode } : {}) });
  return new NextResponse(null, { status: 204 });
}
