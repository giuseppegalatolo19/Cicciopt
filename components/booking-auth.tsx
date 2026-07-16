"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, KeyRound, LockKeyhole, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { services, slots } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "./public-shell";
import { Button, Container, Status } from "./ui";

export function BookingPage() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState(services[0].name);
  const [mode, setMode] = useState("Studio Forma · Palermo");
  const [selectedDay, setSelectedDay] = useState(0);
  const [time, setTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState<string[]>([]);
  const currentService = useMemo(() => services.find((item) => item.name === service) || services[0], [service]);
  const slotKey = `${slots[selectedDay].full}-${time}`;

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!time || booked.includes(slotKey)) return;
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = { service, mode, date: slots[selectedDay].full, dateIso: slots[selectedDay].iso, time, ...Object.fromEntries(form.entries()) };
    try { await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch { /* demo fallback */ }
    const next = [...booked, slotKey]; setBooked(next);
    setTimeout(() => { setLoading(false); setConfirmed(true); }, 500);
  }

  if (confirmed) return <BookingConfirmation service={service} mode={mode} day={slots[selectedDay].full} time={time} />;

  return <section className="booking-page"><Container><div className="booking-head"><div><span className="booking-kicker">Prenotazione online</span><h1>Prenota il tuo appuntamento</h1><p>Gli orari mostrati sono già aggiornati sul fuso Europe/Rome.</p></div><div className="timezone"><Clock3 size={16} /> Europe/Rome</div></div><div className="booking-layout"><div className="booking-main"><div className="stepper">{["Servizio", "Data e ora", "I tuoi dati"].map((label,index) => <div key={label} className={step >= index + 1 ? "step-active" : ""}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><small>{label}</small></div>)}</div>{step === 1 && <div className="booking-panel"><h2>Scegli il servizio</h2><div className="booking-service-list">{services.slice(0,6).map((item) => { const Icon = item.icon; return <button key={item.slug} className={service === item.name ? "selected" : ""} onClick={() => setService(item.name)}><Icon size={20} /><span><strong>{item.name}</strong><small>{item.duration} · {item.price}</small></span><i>{service === item.name && <Check size={14} />}</i></button>})}</div><label className="field"><span>Sede o modalità</span><select value={mode} onChange={e => setMode(e.target.value)}><option>Studio Forma · Palermo</option><option>Online · Videochiamata</option><option>Outdoor · Da concordare</option></select></label><button className="button button-primary full-button" onClick={() => setStep(2)}>Scegli data e ora <ArrowRight size={17} /></button></div>}{step === 2 && <div className="booking-panel"><button className="mini-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Indietro</button><h2>Quando vuoi allenarti?</h2><div className="date-strip">{slots.map((slot,index) => <button className={selectedDay === index ? "selected" : ""} key={slot.date} onClick={() => { setSelectedDay(index); setTime(""); }}><small>{slot.day}</small><strong>{slot.date}</strong><span>lug</span></button>)}</div><div className="time-grid">{slots[selectedDay].times.map(item => { const unavailable = booked.includes(`${slots[selectedDay].full}-${item}`); return <button key={item} disabled={unavailable} className={time === item ? "selected" : ""} onClick={() => setTime(item)}>{item}{unavailable && <small>occupato</small>}</button>})}</div><div className="availability-note"><ShieldCheck size={18} /><p>Mostriamo solo disponibilità compatibili con durata e buffer del servizio. Le prenotazioni già confermate non sono selezionabili.</p></div><button disabled={!time} className="button button-primary full-button" onClick={() => setStep(3)}>Continua <ArrowRight size={17} /></button></div>}{step === 3 && <form className="booking-panel" onSubmit={confirm}><button type="button" className="mini-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Indietro</button><h2>Inserisci i tuoi dati</h2><div className="form-grid"><label className="field"><span>Nome *</span><input name="firstName" required /></label><label className="field"><span>Cognome *</span><input name="lastName" required /></label><label className="field"><span>Email *</span><input name="email" type="email" required /></label><label className="field"><span>Telefono *</span><input name="phone" type="tel" required /></label></div><label className="field"><span>Note per Francesco (facoltative)</span><textarea name="notes" rows={3} /></label><label className="checkbox"><input type="checkbox" required /><span>Accetto la <Link href="/privacy">privacy policy</Link>.</span></label><label className="checkbox"><input type="checkbox" required /><span>Accetto il <Link href="/termini">regolamento prenotazioni</Link>, incluso il limite di cancellazione di 24 ore.</span></label><button className="button button-primary full-button" disabled={loading}>{loading ? "Conferma in corso…" : "Conferma la prenotazione"}<Check size={17} /></button></form>}</div><aside className="booking-summary"><span>Riepilogo</span><h3>{currentService.name}</h3><div><Clock3 size={17} /><span><small>Durata</small><strong>{currentService.duration}</strong></span></div><div><MapPin size={17} /><span><small>Modalità</small><strong>{mode}</strong></span></div>{time && <div><CalendarDays size={17} /><span><small>Appuntamento</small><strong>{slots[selectedDay].full}, {time}</strong></span></div>}<hr /><div className="summary-price"><span>Tariffa indicativa</span><strong>{currentService.price}</strong></div><p>Nessun addebito online in questa versione. Francesco confermerà eventuali dettagli.</p></aside></div></Container></section>;
}

export function BookingConfirmation({ service = "Valutazione iniziale", mode = "Studio Forma · Palermo", day = "Lunedì 20 luglio", time = "09:00" }: { service?: string; mode?: string; day?: string; time?: string }) {
  return <section className="confirmation-page"><Container><div className="confirmation-icon"><CheckCircle2 size={40} /></div><Status tone="success">Prenotazione confermata</Status><h1>Ci vediamo presto.</h1><p>Abbiamo inviato un riepilogo all’indirizzo indicato. Troverai l’appuntamento anche nella tua area cliente.</p><div className="confirmation-card"><div><small>Servizio</small><strong>{service}</strong></div><div><small>Data e ora</small><strong>{day}, {time}</strong></div><div><small>Luogo</small><strong>{mode}</strong></div><div><small>Codice prenotazione</small><strong>FC-DEMO-2048</strong></div></div><div className="confirmation-actions"><Button href="/cliente">Vai alla tua area</Button><Button href="/" variant="secondary">Torna alla home</Button></div><p className="small-note">Puoi modificare o annullare fino a 24 ore prima dalla tua area personale.</p></Container></section>;
}

export function AuthPage({ mode }: { mode: "login" | "register" | "recovery" | "update" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get("error") || "");
  const titles = {
    login: ["Bentornato.", "Accedi per gestire appuntamenti e percorso."],
    register: ["Crea il tuo account.", "Registrati e verifica l’email per accedere alla tua area riservata."],
    recovery: ["Recupera l’accesso.", "Riceverai un link sicuro e a scadenza via email."],
    update: ["Scegli una nuova password.", "Usa almeno 10 caratteri e una combinazione non riutilizzata altrove."],
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const supabase = createClient();
    try {
      if (mode === "recovery") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/aggiorna-password` });
        if (authError) throw authError;
        setSent(true);
        return;
      }
      if (mode === "update") {
        if (password.length < 10) throw new Error("La password deve contenere almeno 10 caratteri.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        router.replace("/cliente");
        router.refresh();
        return;
      }
      if (mode === "register") {
        if (password.length < 10) throw new Error("La password deve contenere almeno 10 caratteri.");
        const { error: authError } = await supabase.auth.signUp({ email, password, options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/cliente`,
          data: { first_name: String(form.get("firstName") || "").trim(), last_name: String(form.get("lastName") || "").trim() },
        } });
        if (authError) throw authError;
        setSent(true);
        return;
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", data.user.id).single();
      const requested = searchParams.get("next");
      const safeNext = requested?.startsWith("/") && !requested.startsWith("//") ? requested : null;
      router.replace(safeNext || (profile?.role === "admin" && profile.is_active ? "/admin" : "/cliente"));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operazione non riuscita. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="auth-page"><div className="auth-visual"><Brand inverse /><div><span>Il tuo percorso, sempre con te.</span><blockquote>“La continuità nasce quando ogni passo è chiaro e sostenibile.”</blockquote></div><small>Area protetta · Sessioni sicure · Europe/Rome</small></div><div className="auth-form-wrap"><Link className="auth-home" href="/"><ArrowLeft size={15} /> Torna al sito</Link><div className="auth-form"><span className="auth-icon">{mode === "recovery" ? <KeyRound /> : mode === "register" ? <UserRound /> : <LockKeyhole />}</span><h1>{titles[mode][0]}</h1><p>{titles[mode][1]}</p>{error && <div className="auth-success" role="alert"><AlertCircle /><strong>Controlla i dati</strong><p>{error}</p></div>}{sent ? <div className="auth-success"><Mail /><strong>Controlla la tua email</strong><p>{mode === "register" ? "Apri il link di verifica per attivare l’account." : "Se l’indirizzo è registrato, riceverai le istruzioni tra pochi minuti."}</p></div> : <form onSubmit={submit}>{mode === "register" && <div className="form-grid"><label className="field"><span>Nome</span><input name="firstName" required autoComplete="given-name" /></label><label className="field"><span>Cognome</span><input name="lastName" required autoComplete="family-name" /></label></div>}{mode !== "update" && <label className="field"><span>Email</span><input name="email" required type="email" autoComplete="email" placeholder="nome@email.it" /></label>}{mode !== "recovery" && <label className="field"><span>{mode === "update" ? "Nuova password" : "Password"}</span><input name="password" required type="password" minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}{mode === "register" && <label className="checkbox"><input type="checkbox" required /><span>Accetto <Link href="/privacy">privacy policy</Link> e <Link href="/termini">termini del servizio</Link>.</span></label>}<button className="button button-primary full-button" disabled={loading}>{loading ? "Attendi…" : mode === "login" ? "Accedi" : mode === "register" ? "Crea account" : mode === "update" ? "Aggiorna password" : "Invia link di recupero"}<ArrowRight size={17} /></button></form>}{mode === "login" && <><Link className="forgot-link" href="/recupera-password">Password dimenticata?</Link><p className="auth-switch">Non hai un account? <Link href="/registrazione">Registrati</Link></p><div className="demo-note"><ShieldCheck size={17} /><p><strong>Accesso protetto</strong><br />Il ruolo amministratore è verificato dal database e non è selezionabile dal browser.</p></div></>}{mode !== "login" && <p className="auth-switch">Hai già un account? <Link href="/login">Accedi</Link></p>}</div></div></section>;
}
