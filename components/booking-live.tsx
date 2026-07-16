"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { BookingConfirmation } from "./booking-auth";
import { Container } from "./ui";

type Service = { id: string; name: string; short_description: string; duration_minutes: number; buffer_minutes: number; price_cents: number | null; manual_approval: boolean };
type Location = { id: string; name: string; address: string | null; city: string | null; mode: string };
type LinkRow = { service_id: string; location_id: string };
type Slot = { starts_at: string; ends_at: string };

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
  const [confirmed, setConfirmed] = useState(false);
  const days = useMemo(daysFromToday, []);
  const selectedService = services.find((item) => item.id === serviceId);
  const availableLocations = locations.filter((location) => links.some((link) => link.service_id === serviceId && link.location_id === location.id));
  const selectedLocation = locations.find((item) => item.id === locationId);

  useEffect(() => {
    fetch("/api/bookings")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Catalogo non disponibile.");
        setServices(payload.services);
        setLocations(payload.locations);
        setLinks(payload.serviceLocations);
        setServiceId(payload.services[0]?.id || "");
        if (rescheduleId) {
          const appointmentResponse = await fetch("/api/client/appointments");
          const appointmentPayload = await appointmentResponse.json();
          const appointment = appointmentPayload.appointments?.find((item: { id: string }) => item.id === rescheduleId);
          if (!appointment) throw new Error("Appuntamento da modificare non trovato.");
          setServiceId(appointment.service_id);
          setLocationId(appointment.location_id);
          setStep(2);
        }
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Servizio non disponibile."))
      .finally(() => setLoading(false));
  }, [rescheduleId]);

  useEffect(() => {
    const allowed = locations.filter((location) => links.some((link) => link.service_id === serviceId && link.location_id === location.id));
    if (!allowed.some((item) => item.id === locationId)) setLocationId(allowed[0]?.id || "");
  }, [serviceId, links, locations, locationId]);

  useEffect(() => {
    setStartsAt("");
    setSlots([]);
    if (step < 2 || !serviceId || !locationId) return;
    setLoading(true);
    fetch(`/api/bookings?serviceId=${encodeURIComponent(serviceId)}&locationId=${encodeURIComponent(locationId)}&day=${days[day].iso}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Disponibilità non raggiungibile.");
        setSlots(payload.slots);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Disponibilità non raggiungibile."))
      .finally(() => setLoading(false));
  }, [day, days, locationId, serviceId, step]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startsAt) return;
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(rescheduleId ? "/api/client/appointments" : "/api/bookings", {
      method: rescheduleId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rescheduleId ? { id: rescheduleId, startsAt } : { serviceId, locationId, startsAt, ...Object.fromEntries(form.entries()) }),
    }).catch(() => null);
    if (!response) { setError("Connessione non disponibile."); setSubmitting(false); return; }
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || "Prenotazione non riuscita."); setSubmitting(false); return; }
    setConfirmed(true);
    setSubmitting(false);
  }

  const dateText = startsAt ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long" }).format(new Date(startsAt)) : "";
  const timeText = startsAt ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(startsAt)) : "";
  if (confirmed) return <BookingConfirmation service={selectedService?.name} mode={selectedLocation?.name} day={dateText} time={timeText} />;

  return <section className="booking-page"><Container><div className="booking-head"><div><span className="booking-kicker">Prenotazione online</span><h1>Prenota il tuo appuntamento</h1><p>Gli orari sono calcolati in tempo reale sul fuso Europe/Rome.</p></div><div className="timezone"><Clock3 size={16} /> Europe/Rome</div></div><div className="booking-layout"><div className="booking-main"><div className="stepper">{["Servizio", "Data e ora", "I tuoi dati"].map((label,index) => <div key={label} className={step >= index + 1 ? "step-active" : ""}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><small>{label}</small></div>)}</div>{error && <div className="availability-note" role="alert"><ShieldCheck size={18} /><p>{error}</p></div>}{step === 1 && <div className="booking-panel"><h2>Scegli il servizio</h2>{loading ? <p>Caricamento servizi…</p> : <div className="booking-service-list">{services.map((item) => <button type="button" key={item.id} className={serviceId === item.id ? "selected" : ""} onClick={() => setServiceId(item.id)}><span><strong>{item.name}</strong><small>{item.duration_minutes} min · {item.price_cents == null ? "Su richiesta" : `${(item.price_cents / 100).toFixed(0)} €`}</small></span><i>{serviceId === item.id && <Check size={14} />}</i></button>)}</div>}<label className="field"><span>Sede o modalità</span><select value={locationId} onChange={(event) => setLocationId(event.target.value)}>{availableLocations.map((item) => <option key={item.id} value={item.id}>{item.name}{item.city ? ` · ${item.city}` : ""}</option>)}</select></label><button type="button" disabled={!serviceId || !locationId} className="button button-primary full-button" onClick={() => setStep(2)}>Scegli data e ora <ArrowRight size={17} /></button></div>}{step === 2 && <div className="booking-panel"><button type="button" className="mini-back" onClick={() => setStep(1)}><ArrowLeft size={15} /> Indietro</button><h2>Quando vuoi allenarti?</h2><div className="date-strip">{days.slice(0,7).map((item,index) => <button type="button" className={day === index ? "selected" : ""} key={item.iso} onClick={() => setDay(index)}><small>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short" }).format(item.instant)}</small><strong>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit" }).format(item.instant)}</strong><span>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", month: "short" }).format(item.instant)}</span></button>)}</div><div className="time-grid">{loading ? <p>Verifica disponibilità…</p> : slots.length ? slots.map((slot) => <button type="button" key={slot.starts_at} className={startsAt === slot.starts_at ? "selected" : ""} onClick={() => setStartsAt(slot.starts_at)}>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(new Date(slot.starts_at))}</button>) : <p>Nessun orario disponibile in questa data.</p>}</div><div className="availability-note"><ShieldCheck size={18} /><p>Durata, buffer, chiusure e appuntamenti esistenti sono verificati anche dal database.</p></div><button type="button" disabled={!startsAt} className="button button-primary full-button" onClick={() => setStep(3)}>Continua <ArrowRight size={17} /></button></div>}{step === 3 && <form className="booking-panel" onSubmit={confirm}><button type="button" className="mini-back" onClick={() => setStep(2)}><ArrowLeft size={15} /> Indietro</button><h2>Inserisci i tuoi dati</h2><div className="form-grid"><label className="field"><span>Nome *</span><input name="firstName" required maxLength={80} autoComplete="given-name" /></label><label className="field"><span>Cognome *</span><input name="lastName" required maxLength={80} autoComplete="family-name" /></label><label className="field"><span>Email *</span><input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label className="field"><span>Telefono</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label></div><label className="field" aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}><span>Sito web</span><input name="website" tabIndex={-1} autoComplete="off" /></label><label className="field"><span>Note per Francesco (facoltative)</span><textarea name="notes" rows={3} maxLength={1000} /></label><label className="checkbox"><input type="checkbox" required /><span>Accetto la <Link href="/privacy">privacy policy</Link>.</span></label><label className="checkbox"><input type="checkbox" required /><span>Accetto il <Link href="/termini">regolamento prenotazioni</Link>.</span></label><button className="button button-primary full-button" disabled={submitting}>{submitting ? "Conferma in corso…" : "Conferma la prenotazione"}<Check size={17} /></button></form>}</div><aside className="booking-summary"><span>Riepilogo</span><h3>{selectedService?.name || "Seleziona un servizio"}</h3><div><Clock3 size={17} /><span><small>Durata</small><strong>{selectedService ? `${selectedService.duration_minutes} minuti` : "—"}</strong></span></div><div><MapPin size={17} /><span><small>Modalità</small><strong>{selectedLocation?.name || "—"}</strong></span></div>{startsAt && <div><CalendarDays size={17} /><span><small>Appuntamento</small><strong>{dateText}, {timeText}</strong></span></div>}<hr /><div className="summary-price"><span>Tariffa indicativa</span><strong>{selectedService?.price_cents == null ? "Su richiesta" : `${(selectedService.price_cents / 100).toFixed(0)} €`}</strong></div><p>Nessun addebito online. Riceverai la conferma all’indirizzo indicato.</p></aside></div></Container></section>;
}
