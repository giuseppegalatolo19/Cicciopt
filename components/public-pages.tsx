"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Award,
  Building2,
  CalendarCheck,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HeartHandshake,
  Instagram,
  Mail,
  Map,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";
import { faqs, methodSteps, services, testimonials } from "@/lib/data";
import { Button, CheckItem, Container, Eyebrow, SectionTitle } from "./ui";

export function Home() {
  return (
    <>
      <section className="hero">
        <Image className="hero-image" src="/images/francesco-hero.png" alt="Personal trainer che segue con attenzione l’esecuzione di un esercizio" fill priority sizes="100vw" />
        <div className="hero-overlay" />
        <Container className="hero-content">
          <div className="hero-copy">
            <Eyebrow tone="dark">Personal trainer · Palermo & online</Eyebrow>
            <h1>Costruisci la tua forza.<br /><em>Con metodo.</em></h1>
            <p>Allenamento personalizzato, metodo e supporto costante per costruire risultati concreti e sostenibili.</p>
            <div className="hero-actions"><Button href="/prenota">Prenota una consulenza</Button><Button href="/servizi" variant="light">Scopri i servizi</Button></div>
            <div className="hero-trust"><span><ShieldCheck size={18} /> Percorso su misura</span><span><CalendarCheck size={18} /> Prenotazione semplice</span></div>
          </div>
        </Container>
        <a href="#inizia" className="scroll-cue" aria-label="Scorri alla presentazione"><ArrowDown size={18} /></a>
      </section>

      <section className="section intro-section" id="inizia">
        <Container>
          <div className="intro-grid">
            <div className="intro-statement"><span>01 — Il percorso</span><h2>Allenarsi bene significa sentirsi <em>capiti,</em> prima ancora che guidati.</h2></div>
            <div className="intro-copy"><p>Sono Francesco Crivello, Personal Trainer. Aiuto persone con esperienze e obiettivi diversi a costruire un rapporto più consapevole con l’allenamento.</p><p>Partiamo dall’ascolto, definiamo obiettivi realistici e costruiamo un percorso progressivo: ogni scelta ha un motivo, ogni progresso trova il suo tempo.</p><Link href="/chi-sono" className="text-link">Conosci Francesco <ArrowRight size={16} /></Link></div>
          </div>
          <div className="value-strip">
            <div><span>01</span><strong>Ascolto</strong><p>La tua storia viene prima della scheda.</p></div>
            <div><span>02</span><strong>Metodo</strong><p>Scelte motivate, progressioni misurabili.</p></div>
            <div><span>03</span><strong>Continuità</strong><p>Un percorso compatibile con la vita reale.</p></div>
          </div>
        </Container>
      </section>

      <section className="section services-section">
        <Container>
          <div className="section-heading-row"><SectionTitle eyebrow="Servizi" title={<>Il percorso giusto,<br /><em>al tuo ritmo.</em></>} body="Dalla prima valutazione al coaching online: soluzioni flessibili, sempre costruite intorno alle tue esigenze." /><Button href="/servizi" variant="secondary">Vedi tutti i servizi</Button></div>
          <div className="service-grid featured-services">{services.slice(0, 6).map((service, index) => <ServiceCard key={service.slug} service={service} index={index} />)}</div>
        </Container>
      </section>

      <MethodSection />

      <section className="section location-section">
        <Container>
          <div className="location-card">
            <div className="location-visual"><div className="studio-placeholder"><Building2 size={44} /><span>Foto della struttura</span><small>segnaposto modificabile da admin</small></div><div className="location-badge"><MapPin size={20} /><span><small>Allenati a</small><strong>Studio Forma</strong></span></div></div>
            <div className="location-copy"><Eyebrow>La sede</Eyebrow><h2>Uno spazio pensato per allenarti <em>con calma.</em></h2><p>Uno studio riservato, luminoso e attrezzato per lavorare con attenzione, senza confusione e senza attese.</p><div className="location-features"><span><MapPin size={18} /> Via Esempio 24, Palermo</span><span><Clock3 size={18} /> Lun–Ven · 07:30–20:30</span><span><Car size={18} /> Parcheggio nelle vicinanze</span><span><Users size={18} /> Accesso su appuntamento</span></div><div className="button-row"><Button href="/sede-contatti">Scopri la sede</Button><a className="map-link" href="https://maps.google.com" target="_blank" rel="noreferrer">Apri su Maps <Navigation size={15} /></a></div></div>
          </div>
        </Container>
      </section>

      <section className="section testimonials-section">
        <Container><SectionTitle eyebrow="Esperienze" title={<>Il valore di sentirsi<br /><em>seguiti davvero.</em></>} body="Recensioni dimostrative. Le testimonianze reali saranno pubblicate solo con consenso esplicito." /><div className="testimonial-grid">{testimonials.map((item) => <article className="testimonial-card" key={item.name}><Quote size={28} /><div className="stars" aria-label="5 stelle">{[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}</div><blockquote>“{item.quote}”</blockquote><footer><span className="testimonial-avatar">{item.name[0]}</span><span><strong>{item.name}</strong><small>{item.meta}</small></span></footer></article>)}</div></Container>
      </section>

      <section className="cta-section"><Container><div><Eyebrow tone="dark">Il primo passo è semplice</Eyebrow><h2>Parliamo dei tuoi obiettivi.</h2><p>Una consulenza conoscitiva, senza pressioni, per capire insieme da dove partire.</p></div><Button href="/prenota">Prenota una consulenza</Button></Container></section>
    </>
  );
}

function ServiceCard({ service, index }: { service: (typeof services)[number]; index: number }) {
  const Icon = service.icon;
  return <article className={`service-card ${index === 0 ? "service-card-highlight" : ""}`}><div className="service-card-top"><span className="service-icon"><Icon size={22} /></span><small>{String(index + 1).padStart(2, "0")}</small></div><h3>{service.name}</h3><p>{service.short}</p><div className="service-meta"><span>{service.duration}</span><i /><span>{service.mode}</span></div><Link href={`/servizi/${service.slug}`} aria-label={`Scopri ${service.name}`}><ArrowRight size={18} /></Link></article>;
}

export function ServicesPage() {
  return <><PageHero eyebrow="Servizi" title={<>Un allenamento che<br /><em>parla di te.</em></>} body="Ogni servizio è un punto di partenza. Il percorso viene poi adattato a obiettivi, esperienza e disponibilità." /><section className="section"><Container><div className="service-grid all-services">{services.map((service, index) => <ServiceCard key={service.slug} service={service} index={index} />)}</div></Container></section><ContactBand /></>;
}

export function ServiceDetail({ slug }: { slug: string }) {
  const service = services.find((item) => item.slug === slug) || services[0];
  const Icon = service.icon;
  return <><section className="detail-hero"><Container><Link className="back-link" href="/servizi">← Tutti i servizi</Link><div className="detail-hero-grid"><div><span className="large-service-icon"><Icon size={30} /></span><Eyebrow tone="dark">Percorso personalizzato</Eyebrow><h1>{service.name}</h1><p>{service.short} La proposta definitiva viene concordata dopo un colloquio conoscitivo.</p><div className="hero-actions"><Button href="/prenota">Prenota ora</Button><Button href="/sede-contatti" variant="light">Richiedi informazioni</Button></div></div><div className="detail-summary"><div><small>Durata</small><strong>{service.duration}</strong></div><div><small>Modalità</small><strong>{service.mode}</strong></div><div><small>Investimento</small><strong>{service.price}</strong></div><div><small>Prima di iniziare</small><strong>Colloquio + anamnesi</strong></div></div></div></Container></section><section className="section"><Container className="content-narrow"><SectionTitle eyebrow="Come funziona" title="Un percorso chiaro, dall’inizio." body="Questi contenuti sono modificabili dalla dashboard amministrativa." /><div className="detail-columns"><div><h3>Per chi è indicato</h3><CheckItem>Vuoi essere seguito con attenzione tecnica</CheckItem><CheckItem>Cerchi una programmazione sostenibile</CheckItem><CheckItem>Preferisci obiettivi concreti e verificabili</CheckItem><CheckItem>Vuoi allenarti con maggiore sicurezza</CheckItem></div><div><h3>Cosa include</h3><CheckItem>Colloquio e valutazione iniziale</CheckItem><CheckItem>Programmazione personalizzata</CheckItem><CheckItem>Monitoraggio dei progressi</CheckItem><CheckItem>Aggiornamenti periodici del percorso</CheckItem></div></div></Container></section><ContactBand /></>;
}

export function MethodSection() {
  return <section className="section method-section"><Container><SectionTitle eyebrow="Il metodo" light title={<>Otto passi. Un percorso<br /><em>costruito insieme.</em></>} body="Niente formule universali: partiamo dalla persona e adattiamo il lavoro lungo il cammino." /><div className="method-grid">{methodSteps.map(([num, title, body], index) => <article key={num} className={index < 2 ? "active" : ""}><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><div className="method-action"><Button href="/metodo" variant="light">Approfondisci il metodo</Button></div></Container></section>;
}

export function MethodPage() {
  return <><PageHero eyebrow="Il metodo" title={<>Un processo solido.<br /><em>Mai rigido.</em></>} body="Il programma cambia con te: ascolto, dati utili e verifiche periodiche ci aiutano a prendere decisioni migliori." /><section className="section method-page"><Container><div className="timeline">{methodSteps.map(([num,title,body], index) => <article key={num}><div className="timeline-num">{num}</div><div><small>{index < 3 ? "Conoscere" : index < 6 ? "Costruire" : "Progredire"}</small><h2>{title}</h2><p>{body}</p></div></article>)}</div></Container></section><section className="notice-band"><Container><ShieldCheck size={30} /><div><strong>Sicurezza prima di tutto</strong><p>L’anamnesi orienta il percorso ma non sostituisce diagnosi, visite o indicazioni del medico.</p></div></Container></section></>;
}

export function AboutPage() {
  return <><section className="about-hero"><Container><div className="about-photo"><Image src="/images/francesco-hero.png" alt="Francesco Crivello durante una sessione" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div><Eyebrow>Chi sono</Eyebrow><h1>Competenza, ascolto<br />e un metodo che <em>si adatta.</em></h1><p>Sono Francesco Crivello, Personal Trainer. Credo in un allenamento costruito con cura: abbastanza sfidante da farti crescere, abbastanza realistico da diventare parte della tua vita.</p><Button href="/prenota">Conosciamoci</Button></div></Container></section><section className="section"><Container><div className="about-grid"><div><SectionTitle eyebrow="Il profilo" title="Formazione e pratica, al servizio della persona." /><p className="large-copy">[Testo modificabile] Inserire qui la presentazione professionale, il percorso formativo e le esperienze lavorative di Francesco.</p></div><div className="credentials"><article><Award /><div><h3>Formazione</h3><p>[Laurea, diploma o percorso formativo da inserire]</p></div></article><article><ShieldCheck /><div><h3>Certificazioni</h3><p>[Certificazioni professionali da inserire e verificare]</p></div></article><article><Target /><div><h3>Specializzazioni</h3><p>Forza, ricomposizione, mobilità e preparazione atletica.</p></div></article><article><HeartHandshake /><div><h3>Persone seguite</h3><p>Principianti, sportivi amatoriali e persone che riprendono ad allenarsi.</p></div></article></div></div></Container></section><section className="philosophy"><Container><Sparkles /><blockquote>“Non inseguo scorciatoie. Costruiamo capacità, fiducia e abitudini che possano restare.”</blockquote><span>— Filosofia di allenamento, testo modificabile</span></Container></section><ContactBand /></>;
}

export function LocationPage() {
  return <><PageHero eyebrow="Sede & contatti" title={<>Il tuo spazio per<br /><em>allenarti bene.</em></>} body="Una sede riservata a Palermo e percorsi online per lavorare con continuità, ovunque tu sia." /><section className="section"><Container><div className="location-detail-grid"><div className="map-placeholder"><div className="map-grid" /><span><MapPin size={28} /></span><div className="map-label"><strong>Studio Forma</strong><small>Via Esempio 24, Palermo</small></div></div><div><Eyebrow>Studio principale</Eyebrow><h2>Studio Forma</h2><p className="large-copy">[Descrizione modificabile] Ambiente luminoso e riservato, con area pesi, zona funzionale e spazio dedicato alla valutazione.</p><div className="info-list"><span><MapPin /> <b>Indirizzo</b><em>Via Esempio 24, Palermo</em></span><span><Clock3 /> <b>Orari</b><em>Lun–Ven, 07:30–20:30</em></span><span><Car /> <b>Parcheggio</b><em>Strisce libere nelle vicinanze</em></span><span><Building2 /> <b>Accessibilità</b><em>Ingresso a piano terra</em></span></div><a className="button button-primary" href="https://maps.google.com" target="_blank" rel="noreferrer">Apri su Google Maps <Navigation size={16} /></a></div></div></Container></section><section className="section muted-section"><Container><div className="equipment-grid"><div><h3>Attrezzature</h3><p>Rack, bilancieri, manubri, cavi, kettlebell, panche e piccoli attrezzi.</p></div><div><h3>Altre modalità</h3><p>Coaching online e, su disponibilità, sessioni outdoor o a domicilio.</p></div><div><h3>Come arrivare</h3><p>[Indicazioni con mezzi pubblici e riferimenti locali da completare.]</p></div></div></Container></section><ContactForm /></>;
}

export function FaqPage() {
  return <><PageHero eyebrow="Domande frequenti" title={<>Prima di iniziare,<br /><em>tutto più chiaro.</em></>} body="Le risposte alle domande più comuni. Se non trovi ciò che cerchi, scrivimi." /><section className="section"><Container className="faq-wrap"><div className="faq-list">{faqs.map(([q,a], index) => <Faq key={q} question={q} answer={a} defaultOpen={index === 0} />)}</div><aside className="faq-aside"><MessageCircle size={26} /><h3>Hai un’altra domanda?</h3><p>Scrivimi: ti risponderò con tutte le informazioni utili, senza impegno.</p><Button href="/sede-contatti">Contattami</Button></aside></Container></section></>;
}

function Faq({ question, answer, defaultOpen = false }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <article className={open ? "faq-item faq-open" : "faq-item"}><button onClick={() => setOpen(!open)} aria-expanded={open}><span>{question}</span><ChevronDown size={20} /></button>{open && <p>{answer}</p>}</article>;
}

export function PageHero({ eyebrow, title, body }: { eyebrow: string; title: React.ReactNode; body: string }) {
  return <section className="page-hero"><Container><Eyebrow tone="dark">{eyebrow}</Eyebrow><h1>{title}</h1><p>{body}</p></Container></section>;
}

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try { await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch { /* demo fallback */ }
    localStorage.setItem("demo-contact-request", JSON.stringify({ ...payload, status: "Nuova", createdAt: new Date().toISOString() }));
    setTimeout(() => { setLoading(false); setSent(true); }, 500);
  }
  return <section className="section contact-section" id="contatti"><Container><div><Eyebrow>Parliamone</Eyebrow><h2>Raccontami da dove vuoi partire.</h2><p>Compila il modulo: riceverai una conferma e ti ricontatterò per capire insieme il passo successivo.</p><div className="direct-contacts"><a href="tel:+390000000000"><Phone /> +39 000 000 0000</a><a href="mailto:ciao@francescocrivello.it"><Mail /> ciao@francescocrivello.it</a><a href="#"><Instagram /> @francescocrivello.pt</a></div></div>{sent ? <div className="form-success"><CheckCircle2 size={42} /><h3>Richiesta inviata</h3><p>Grazie! La richiesta è stata registrata come “Nuova”. Riceverai una conferma all’indirizzo indicato.</p><button onClick={() => setSent(false)} className="button button-secondary">Invia un’altra richiesta</button></div> : <form className="contact-form" onSubmit={submit}><div className="form-grid"><Field label="Nome" name="firstName" required /><Field label="Cognome" name="lastName" required /><Field label="Email" name="email" type="email" required /><Field label="Telefono" name="phone" type="tel" required /><Select label="Servizio di interesse" name="service" options={services.slice(0,5).map(s => s.name)} /><Select label="Obiettivo principale" name="goal" options={["Benessere generale", "Forza", "Ricomposizione corporea", "Mobilità", "Preparazione sportiva"]} /><Select label="Modalità preferita" name="mode" options={["In studio", "Online", "Ibrida", "Da definire"]} /><Select label="Fascia oraria" name="time" options={["Mattina", "Pausa pranzo", "Pomeriggio", "Sera"]} /></div><label className="field"><span>Messaggio</span><textarea name="message" rows={4} placeholder="Racconta brevemente cosa vorresti migliorare…" /></label><label className="checkbox"><input type="checkbox" name="privacy" required /><span>Ho letto la <Link href="/privacy">privacy policy</Link> e acconsento al trattamento dei dati.</span></label><label className="checkbox"><input type="checkbox" name="contactConsent" required /><span>Acconsento a essere ricontattato in merito a questa richiesta.</span></label><button className="button button-primary full-button" disabled={loading}>{loading ? "Invio in corso…" : "Invia la richiesta"}<ArrowRight size={17} /></button></form>}</Container></section>;
}

export function Field({ label, name, type = "text", required = false, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string }) {
  return <label className="field"><span>{label}{required && " *"}</span><input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue=""><option value="" disabled>Seleziona</option>{options.map(o => <option key={o}>{o}</option>)}</select></label>;
}

export function ContactBand() {
  return <section className="contact-band"><Container><div><small>Non sai quale servizio scegliere?</small><h2>Partiamo da una conversazione.</h2></div><Button href="/sede-contatti">Raccontami i tuoi obiettivi</Button></Container></section>;
}

export function LegalPage({ type }: { type: "privacy" | "cookie" | "terms" }) {
  const titles = { privacy: "Privacy policy", cookie: "Cookie policy", terms: "Termini e regolamento prenotazioni" };
  return <><PageHero eyebrow="Informazioni legali" title={<>{titles[type]}</>} body="Bozza professionale da far verificare e completare al titolare del trattamento e al consulente legale prima della pubblicazione." /><section className="section"><Container className="legal-copy"><div className="legal-notice"><ShieldCheck /><p><strong>Documento segnaposto.</strong> Versione demo 1.0 · ultimo aggiornamento 16 luglio 2026.</p></div>{type === "privacy" ? <><h2>1. Titolare del trattamento</h2><p>Francesco Crivello, [indirizzo e contatti completi da inserire].</p><h2>2. Dati trattati e finalità</h2><p>Dati di contatto per rispondere alle richieste; dati dell’account per erogare i servizi; dati relativi alla salute, solo con consenso esplicito, per personalizzare in sicurezza il percorso.</p><h2>3. Base giuridica e conservazione</h2><p>Consenso, esecuzione di misure precontrattuali e contratto. I tempi di conservazione sono definiti nel registro dei trattamenti e limitati al necessario.</p><h2>4. Diritti</h2><p>Accesso, rettifica, cancellazione, limitazione, portabilità e revoca del consenso possono essere richiesti dall’area personale o ai contatti indicati.</p></> : type === "cookie" ? <><h2>Cookie necessari</h2><p>Servono per sessione, sicurezza, preferenze privacy e funzionamento dei moduli. Non possono essere disattivati dal banner.</p><h2>Misurazione facoltativa</h2><p>Eventuali analytics sono caricati solo dopo consenso. Nessun dato sanitario viene inviato a sistemi pubblicitari o tracciamento.</p><h2>Gestione preferenze</h2><p>Puoi riaprire il pannello dal link “Gestisci cookie” nel footer.</p></> : <><h2>Prenotazioni</h2><p>Le sessioni possono essere modificate o annullate dall’area cliente fino a 24 ore prima, salvo condizioni diverse indicate nel servizio.</p><h2>Ritardi e assenze</h2><p>Le regole definitive, inclusi eventuali addebiti, devono essere accettate separatamente e restano sempre consultabili.</p><h2>Salute e responsabilità</h2><p>L’attività di personal training non sostituisce assistenza medica o fisioterapica. Può essere richiesto un certificato medico valido.</p></>}</Container></section></>;
}
