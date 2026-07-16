export function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const allowedHosts = new Set<string>([new URL(request.url).host]);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (forwardedHost) allowedHosts.add(forwardedHost);
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (configuredSiteUrl) allowedHosts.add(new URL(configuredSiteUrl).host);
    return allowedHosts.has(originUrl.host);
  } catch {
    return false;
  }
}
