"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { BookingConfirmation } from "./booking-auth";
import { Container } from "./ui";

type Service = { id: string; name: string; short_description: string; duration_minutes: number; buffer_minutes: number; manual_approval: boolean };
type Location = { id: string; name: string; address: string | null; city: string | null; mode: string };
type LinkRow = { service_id: string; location_id: string };
type Slot = { starts_at: string; ends_at: string };
type BookingDraft = { step: number; serviceId: string; locationId: string; day: number; startsAt: string; privacyAccepted: boolean; termsAccepted: boolean };
type BookingResult = { bookingId?: string; notificationStatus?: "sent" | "failed" | "not_configured" | "skipped"; claimAvailable?: boolean; contact?: { firstName:string; lastName:string; email:string; phone:string } };

const BOOKING_DRAFT_KEY = "fc-booking-draft";

function daysFromToday() {
  return Array.from({ length: 14 }, (_, offset) => {
    const instant = new Date(Date.now() + offset * 86_400_000);
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
    const get = (type: string) => parts.find((item) => item.type === type)?.value || "";
    return { iso: `${get("year")}-${get("month")}-${get("day")}`, instant };
  });
}

export default function BookingPage() {
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [day, setDay] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<BookingResult | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const submittingRef = useRef(false);
  const days = useMemo(daysFromToday, []);
  const selectedService = services.find((item) => item.id === serviceId);
  const availableLocations = locations.filter((location) => links.some((link) => link.service_id === serviceId && link.location_id === location.id));
  const selectedLocation = locations.find((item) => item.id === locationId);

  useEffect(() => {
    fetch("/api/bookings")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Catalogo non disponibile.");
        const nextServices = payload.services as Service[];
        const nextLocations = payload.locations as Location[];
        const nextLinks = payload.serviceLocations as LinkRow[];
        let draft: Partial<BookingDraft> = {};
        try { draft = JSON.parse(sessionStorage.getItem(BOOKING_DRAFT_KEY) || "{}"); } catch { /* ignore invalid temporary state */ }
        const restoredService = nextServices.some((item) => item.id === draft.serviceId) ? draft.serviceId || "" : nextServices[0]?.id || "";
        const restoredLocations = nextLocations.filter((location) => nextLinks.some((link) => link.service_id === restoredService && link.location_id === location.id));
        const restoredLocation = restoredLocations.some((item) => item.id === draft.locationId) ? draft.locationId || "" : restoredLocations[0]?.id || "";
        setServices(nextServices);
        setLocations(nextLocations);
        setLinks(nextLinks);
        setServiceId(restoredService);
        setLocationId(restoredLocation);
        setDay(typeof draft.day === "number" && draft.day >= 0 && draft.day < 7 ? draft.day : 0);
        setStartsAt(typeof draft.startsAt === "string" ? draft.startsAt : "");
        setPrivacyAccepted(draft.privacyAccepted === true);
        setTermsAccepted(draft.termsAccepted === true);
        setStep(typeof draft.step === "number" ? Math.min(3, Math.max(1, draft.step)) : 1);
        if (rescheduleId) {
          const appointmentResponse = await fetch("/api/client/appointments");
          const appointmentPayload = await appointmentResponse.json();
          const appointment = appointmentPayload.appointments?.find((item: { id: string }) => item.id === rescheduleId);
          if (!appointment) throw new Error("Appuntamento da modificare non trovato.");
          setServiceId(appointment.service_id);
          setLocationId(appointment.location_id);
          setStep(2);
        }
        setCatalogReady(true);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Servizio non disponibile."))
      .finally(() => setLoading(false));
  }, [rescheduleId]);

  useEffect(() => {
    if (!catalogReady || confirmed) return;
    const draft: BookingDraft = { step, serviceId, locationId, day, startsAt, privacyAccepted, termsAccepted };
    sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  }, [catalogReady, confirmed, day, locationId, privacyAccepted, serviceId, startsAt, step, termsAccepted]);

  useEffect(() => {
    const allowed = locations.filter((location) => links.some((link) => link.service_id === serviceId && link.location_id === location.id));
    if (!allowed.some((item) => item.id === locationId)) setLocationId(allowed[0]?.id || "");
  }, [serviceId, links, locations, locationId]);

  useEffect(() => {
    setSlots([]);
    if (step < 2 || !serviceId || !locationId) return;
    setLoading(true);
    fetch(`/api/bookings?serviceId=${encodeURIComponent(serviceId)}&locationId=${encodeURIComponent(locationId)}&day=${days[day].iso}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Disponibilità non raggiungibile.");
        setSlots(payload.slots);
        setStartsAt((current) => payload.slots.some((slot: Slot) => slot.starts_at === current) ? current : "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Disponibilità non raggiungibile."))
      .finally(() => setLoading(false));
  }, [day, days, locationId, serviceId, step]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startsAt || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(rescheduleId ? "/api/client/appointments" : "/api/bookings", {
      method: rescheduleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rescheduleId ? { id: rescheduleId, startsAt } : {
        serviceId,
        locationId,
        startsAt,
        ...Object.fromEntries(form.entries()),
        privacyAccepted,
        termsAccepted,
      }),
    }).catch(() => null);
    if (!response) { setError("Connessione non disponibile."); submittingRef.current = false; setSubmitting(false); return; }
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Prenotazione non riuscita."); submittingRef.current = false; setSubmitting(false); return; }
    sessionStorage.removeItem(BOOKING_DRAFT_KEY);
    setConfirmed({ bookingId: payload.bookingId, notificationStatus: payload.notificationStatus || "skipped", claimAvailable: payload.claimAvailable === true, contact: { firstName:String(form.get("firstName")||""), lastName:String(form.get("lastName")||""), email:String(form.get("email")||""), phone:String(form.get("phone")||"") } });
    submittingRef.current = false;
    setSubmitting(false);
  }

  const dateText = startsAt ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" }).format(new Date(startsAt)) : "";
  const timeText = startsAt ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(startsAt)) : "";
  if (confirmed) return <BookingConfirmation service={selectedService?.name} mode={selectedLocation?.name} day={dateText} time={timeText} bookingCode={confirmed.bookingId?.slice(0, 8).toUpperCase()} notificationStatus={confirmed.notificationStatus} claimAvailable={confirmed.claimAvailable} contact={confirmed.contact} />;

  return <section className="booking-page"><Container><div className="booking-head"><div><span className="booking-kicker">Prenotazione online</span><h1>Prenota il tuo appuntamento</h1><p>Gli orari sono calcolati in tempo reale sul fuso Europe/Rome.</p></div><div className="timezone"><Clock3 size={16} /> Europe/Rome</div></div><div className="booking-layout"><div className="booking-main"><div className="stepper">{["Servizio", "Data e ora", "I tuoi dati"].map((label,index) => <div key={label} className={step >= index + 1 ? "step-active" : ""}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><small>{label}</small></div>)}</div>{error && <div className="availability-note" role="alert"><ShieldCheck size={18} /><p>{error}</p></div>}{step === 1 && <div className="booking-panel"><h2>Scegli il servizio</h2>{loading ? <p>Caricamento servizi…</p> : <div className="booking-service-list">{services.map((item) => <label key={item.id} className={`booking-service-option ${serviceId === item.id ? "selected" : ""}`}><input type="radio" name="service-selection" value={item.id} checked={serviceId === item.id} onChange={() => { setServiceId(item.id); setStartsAt(""); }} /><span><strong>{item.name}</strong><small>{item.short_description} · {item.duration_minutes} min</small></span></label>)}</div>}<label className="field"><span>Modalità di allenamento</span><select value={locationId} onChange={(event) => { setLocationId(event.target.value); setStartsAt(""); }}>{availableLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" disabled={!serviceId || !locationId} className="button button-primary full-button" onClick={() => setStep(2)}>Scegli data e ora <ArrowRight size={17} /></button></div>}{step === 2 && <div className="booking-panel"><button type="button" className="mini-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Indietro</button><h2>Quando vuoi allenarti?</h2><div className="date-strip">{days.slice(0,7).map((item,index) => <button type="button" className={day === index ? "selected" : ""} key={item.iso} onClick={() => { setDay(index); setStartsAt(""); }}><small>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short" }).format(item.instant)}</small><strong>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit" }).format(item.instant)}</strong><span>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", month: "short" }).format(item.instant)}</span></button>)}</div><div className="time-grid">{loading ? <p>Verifica disponibilità…</p> : slots.length ? slots.map((slot) => <button type="button" key={slot.starts_at} className={startsAt === slot.starts_at ? "selected" : ""} onClick={() => setStartsAt(slot.starts_at)}>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(slot.starts_at))}</button>) : <p>Nessun orario disponibile in questa data.</p>}</div><div className="availability-note"><ShieldCheck size={18} /><p>Durata, buffer, chiusure e appuntamenti esistenti sono verificati anche dal database.</p></div><button type="button" disabled={!startsAt} className="button button-primary full-button" onClick={() => setStep(3)}>Continua <ArrowRight size={17} /></button></div>}{step === 3 && <form className="booking-panel" onSubmit={confirm}><button type="button" className="mini-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Indietro</button><h2>Inserisci i tuoi dati</h2><div className="form-grid"><label className="field"><span>Nome *</span><input name="firstName" required maxLength={80} autoComplete="given-name" /></label><label className="field"><span>Cognome *</span><input name="lastName" required maxLength={80} autoComplete="family-name" /></label><label className="field"><span>Email *</span><input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label className="field"><span>Telefono</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label></div><label className="field" aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}><span>Sito web</span><input name="website" tabIndex={-1} autoComplete="off" /></label><label className="field"><span>Note per Francesco (facoltative)</span><textarea name="notes" rows={3} maxLength={1000} /></label><label className="checkbox"><input type="checkbox" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} /><span>Accetto la <Link href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</Link>.</span></label><label className="checkbox"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>Accetto il <Link href="/termini" target="_blank" rel="noopener noreferrer">regolamento prenotazioni</Link>.</span></label><button className="button button-primary full-button" disabled={submitting || !privacyAccepted || !termsAccepted} aria-busy={submitting}>{submitting ? "Conferma in corso…" : "Conferma la prenotazione"}<Check size={17} /></button></form>}</div><aside className="booking-summary"><span>Riepilogo</span><h3>{selectedService?.name || "Seleziona un servizio"}</h3><div><Clock3 size={17} /><span><small>Durata</small><strong>{selectedService ? `${selectedService.duration_minutes} minuti` : "—"}</strong></span></div><div><MapPin size={17} /><span><small>Modalità</small><strong>{selectedLocation?.name || "—"}</strong></span></div>{startsAt && <div><CalendarDays size={17} /><span><small>Appuntamento</small><strong>{dateText}, {timeText}</strong></span></div>}<p>La prenotazione viene registrata prima dell’invio della notifica email.</p></aside></div></Container></section>;
}
