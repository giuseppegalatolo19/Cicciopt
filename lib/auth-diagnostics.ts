export type AuthDiagnosticAction = "login" | "register" | "recovery" | "password_update";
export type AuthDiagnosticPhase = "start" | "success" | "error";

function safeErrorCode(cause: unknown) {
  const value = (cause as { code?: unknown })?.code;
  return typeof value === "string" && /^[a-z0-9_-]{1,80}$/i.test(value) ? value : undefined;
}

export async function recordAuthDiagnostic(
  action: AuthDiagnosticAction,
  phase: AuthDiagnosticPhase,
  requestId: string,
  cause?: unknown,
) {
  try {
    await fetch("/api/auth/diagnostics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, phase, requestId, errorCode: safeErrorCode(cause) }),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // La diagnostica non deve mai impedire un'operazione di autenticazione.
  }
}
