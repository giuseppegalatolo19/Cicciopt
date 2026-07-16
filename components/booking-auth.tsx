"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { recordAuthDiagnostic, type AuthDiagnosticAction } from "@/lib/auth-diagnostics";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "./public-shell";
import { Button, Container, Status } from "./ui";

type NotificationStatus = "sent" | "failed" | "not_configured" | "skipped";

export function BookingConfirmation({
  service = "Valutazione iniziale",
  mode = "Modalità da concordare",
  day = "Data da concordare",
  time = "",
  bookingCode,
  notificationStatus = "skipped",
}: {
  service?: string;
  mode?: string;
  day?: string;
  time?: string;
  bookingCode?: string;
  notificationStatus?: NotificationStatus;
}) {
  const notificationCopy = notificationStatus === "sent"
    ? "La prenotazione è stata registrata e Francesco ha ricevuto la notifica email."
    : notificationStatus === "failed" || notificationStatus === "not_configured"
      ? "La prenotazione è stata registrata correttamente. La notifica email non è partita, ma l’appuntamento è già visibile nella dashboard di Francesco."
      : "La prenotazione è stata registrata correttamente.";

  return <section className="confirmation-page"><Container><div className="confirmation-icon"><CheckCircle2 size={40} /></div><Status tone="success">Prenotazione registrata</Status><h1>Richiesta completata.</h1><p>{notificationCopy}</p><div className="confirmation-card"><div><small>Servizio</small><strong>{service}</strong></div><div><small>Data e ora</small><strong>{day}{time ? `, ${time}` : ""}</strong></div><div><small>Modalità</small><strong>{mode}</strong></div>{bookingCode && <div><small>Codice prenotazione</small><strong>{bookingCode}</strong></div>}</div><div className="confirmation-actions"><Button href="/cliente">Vai alla tua area</Button><Button href="/" variant="secondary">Torna alla home</Button></div><p className="small-note">Puoi modificare o annullare entro i limiti indicati nel regolamento prenotazioni.</p></Container></section>;
}

type AuthMode = "login" | "register" | "recovery";
type AuthFeedback = { title: string; message: string };

function authFeedback(cause: unknown, mode: AuthMode | "reset"): AuthFeedback {
  const error = cause as { code?: string; message?: string; status?: number };
  const code = error?.code || "";
  const message = (error?.message || "").toLowerCase();

  if (error?.status === 429 || code.includes("rate_limit") || message.includes("rate limit") || message.includes("too many")) {
    return { title: "Troppe richieste", message: "Hai effettuato troppe richieste in poco tempo. Attendi qualche minuto prima di riprovare." };
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return { title: "Accesso non riuscito", message: "Email o password non corretti." };
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return { title: "Account non ancora attivo", message: "Completa la verifica tramite l’email ricevuta, poi riprova ad accedere." };
  }
  if (code === "same_password" || message.includes("same password")) {
    return { title: "Scegli una password diversa", message: "La nuova password deve essere diversa da quella utilizzata in precedenza." };
  }
  if (code === "weak_password" || message.includes("password should")) {
    return { title: "Password non valida", message: "Usa almeno 10 caratteri e una combinazione difficile da indovinare." };
  }
  if (message.includes("expired") || code.includes("otp_expired")) {
    return { title: "Link scaduto", message: "Richiedi un nuovo link di recupero password e utilizza soltanto l’email più recente." };
  }
  if (cause instanceof Error && cause.message) {
    return { title: mode === "login" ? "Accesso non riuscito" : "Operazione non riuscita", message: cause.message };
  }
  return { title: "Operazione non riuscita", message: "Riprova tra qualche minuto." };
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inFlight = useRef(false);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(() => {
    const message = searchParams.get("error");
    return message ? { title: "Operazione non riuscita", message } : null;
  });
  const passwordUpdated = mode === "login" && searchParams.get("password") === "updated";
  const titles = {
    login: ["Bentornato.", "Accedi per gestire appuntamenti e percorso."],
    register: ["Crea il tuo account.", "Registrati e verifica l’email per accedere alla tua area riservata."],
    recovery: ["Recupera l’accesso.", "Riceverai un link sicuro e a scadenza via email."],
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    setFeedback(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const supabase = createClient();
    const action: AuthDiagnosticAction = mode === "recovery" ? "recovery" : mode;
    const requestId = crypto.randomUUID();

    try {
      await recordAuthDiagnostic(action, "start", requestId);
      if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: new URL("/reset-password", window.location.origin).toString(),
        });
        if (error) throw error;
        await recordAuthDiagnostic(action, "success", requestId);
        setSent(true);
        return;
      }
      if (mode === "register") {
        if (password.length < 10) throw new Error("La password deve contenere almeno 10 caratteri.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/cliente`,
            data: {
              first_name: String(form.get("firstName") || "").trim(),
              last_name: String(form.get("lastName") || "").trim(),
            },
          },
        });
        if (error) throw error;
        await recordAuthDiagnostic(action, "success", requestId);
        setSent(true);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", data.user.id).single();
      const requested = searchParams.get("next");
      const safeNext = requested?.startsWith("/") && !requested.startsWith("//") ? requested : null;
      await recordAuthDiagnostic(action, "success", requestId);
      router.replace(safeNext || (profile?.role === "admin" && profile.is_active ? "/mfa" : "/cliente"));
      router.refresh();
    } catch (cause) {
      await recordAuthDiagnostic(action, "error", requestId, cause);
      setFeedback(authFeedback(cause, mode));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return <AuthLayout><div className="auth-form"><span className="auth-icon">{mode === "recovery" ? <KeyRound /> : mode === "register" ? <UserRound /> : <LockKeyhole />}</span><h1>{titles[mode][0]}</h1><p>{titles[mode][1]}</p>{passwordUpdated && <div className="auth-success" role="status"><CheckCircle2 /><strong>Password aggiornata</strong><p>Ora puoi accedere con la nuova password.</p></div>}{feedback && <div className="auth-error" role="alert"><AlertCircle /><strong>{feedback.title}</strong><p>{feedback.message}</p></div>}{sent ? <div className="auth-success"><Mail /><strong>Controlla la tua email</strong><p>{mode === "register" ? "Apri il link di verifica per attivare l’account." : "Se l’indirizzo è registrato, riceverai le istruzioni tra pochi minuti."}</p></div> : <form onSubmit={submit}>{mode === "register" && <div className="form-grid"><label className="field"><span>Nome</span><input name="firstName" required autoComplete="given-name" /></label><label className="field"><span>Cognome</span><input name="lastName" required autoComplete="family-name" /></label></div>}<label className="field"><span>Email</span><input name="email" required type="email" autoComplete="email" inputMode="email" placeholder="nome@email.it" /></label>{mode !== "recovery" && <label className="field"><span>Password</span><input name="password" required type="password" minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}{mode === "register" && <label className="checkbox"><input type="checkbox" required /><span>Accetto <Link href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</Link> e <Link href="/termini" target="_blank" rel="noopener noreferrer">termini del servizio</Link>.</span></label>}<button className="button button-primary full-button" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Attendi…" : mode === "login" ? "Accedi" : mode === "register" ? "Crea account" : "Invia link di recupero"}<ArrowRight size={17} /></button></form>}{mode === "login" && <><Link className="forgot-link" href="/recupera-password">Password dimenticata?</Link><p className="auth-switch">Non hai un account? <Link href="/registrazione">Registrati</Link></p><div className="demo-note"><ShieldCheck size={17} /><p><strong>Accesso protetto</strong><br />Il ruolo amministratore è verificato dal database e non è selezionabile dal browser.</p></div></>}{mode !== "login" && <p className="auth-switch">Hai già un account? <Link href="/login">Accedi</Link></p>}</div></AuthLayout>;
}

export function ResetPasswordPage() {
  const router = useRouter();
  const inFlight = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
        setIsPreparing(false);
      }
    });

    async function prepareRecovery() {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        if (params.get("error_description")) throw new Error("Il link di recupero non è valido o è scaduto.");
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const recoveryType = params.get("type") === "recovery" || hash.get("type") === "recovery";

        let { data: current, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!current.session && code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // createBrowserClient può avere già consumato il codice PKCE: ricontrolla
            // la sessione prima di considerare il link non valido.
            const retry = await supabase.auth.getSession();
            if (retry.error) throw retry.error;
            if (!retry.data.session) throw exchangeError;
            current = retry.data;
          }
        } else if (!current.session && tokenHash && recoveryType) {
          const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (verified.error) throw verified.error;
        } else if (!current.session && hash.get("access_token") && hash.get("refresh_token") && recoveryType) {
          const established = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token")!,
          });
          if (established.error) throw established.error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("Il link di recupero non è valido o è scaduto. Richiedine uno nuovo.");
        window.history.replaceState({}, "", "/reset-password");
        if (active) {
          setReady(true);
          setFeedback(null);
        }
      } catch (cause) {
        if (active) setFeedback(authFeedback(cause, "reset"));
      } finally {
        if (active) setIsPreparing(false);
      }
    }

    void prepareRecovery();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("passwordConfirmation") || "");
    if (password.length < 10) return setFeedback({ title: "Password troppo corta", message: "La password deve contenere almeno 10 caratteri." });
    if (password !== confirmation) return setFeedback({ title: "Le password non coincidono", message: "Controlla entrambi i campi e riprova." });

    inFlight.current = true;
    setIsSubmitting(true);
    setFeedback(null);
    const supabase = createClient();
    const requestId = crypto.randomUUID();
    try {
      await recordAuthDiagnostic("password_update", "start", requestId);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await recordAuthDiagnostic("password_update", "success", requestId);
      setSuccess(true);
      setReady(false);
      await supabase.auth.signOut({ scope: "local" });
      redirectTimer.current = setTimeout(() => {
        router.replace("/login?password=updated&next=/admin");
        router.refresh();
      }, 1500);
    } catch (cause) {
      await recordAuthDiagnostic("password_update", "error", requestId, cause);
      setFeedback(authFeedback(cause, "reset"));
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return <AuthLayout><div className="auth-form"><span className="auth-icon"><KeyRound /></span><h1>Scegli una nuova password.</h1><p>Il link è temporaneo. La nuova password deve contenere almeno 10 caratteri.</p>{success && <div className="auth-success" role="status"><CheckCircle2 /><strong>Password aggiornata</strong><p>La modifica è stata salvata. Ora verrai riportato al login amministratore.</p></div>}{feedback && <div className="auth-error" role="alert"><AlertCircle /><strong>{feedback.title}</strong><p>{feedback.message}</p></div>}{isPreparing ? <p>Verifica del link in corso…</p> : ready && !success ? <form onSubmit={updatePassword}><label className="field"><span>Nuova password</span><input name="password" type="password" minLength={10} autoComplete="new-password" required /></label><label className="field"><span>Conferma nuova password</span><input name="passwordConfirmation" type="password" minLength={10} autoComplete="new-password" required /></label><button className="button button-primary full-button" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? "Aggiornamento…" : "Aggiorna password"}<ArrowRight size={17} /></button></form> : !success && <Link className="button button-primary full-button" href="/recupera-password">Richiedi un nuovo link</Link>}</div></AuthLayout>;
}

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <section className="auth-page"><div className="auth-visual"><Brand inverse /><div><span>Il tuo percorso, sempre con te.</span><blockquote>“La continuità nasce quando ogni passo è chiaro e sostenibile.”</blockquote></div><small>Area protetta · Sessioni sicure · Europe/Rome</small></div><div className="auth-form-wrap"><Link className="auth-home" href="/"><ArrowLeft size={15} /> Torna al sito</Link>{children}</div></section>;
}
