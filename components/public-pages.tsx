"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  Award,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  HeartHandshake,
  House,
  Instagram,
  Laptop,
  Mail,
  MessageCircle,
  Phone,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { faqs, methodSteps, services, testimonials } from "@/lib/data";
import { Button, CheckItem, Container, Eyebrow, SectionTitle } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type PublicService = { slug: string; name: string; short: string; full?: string; duration: string; mode: string; icon: LucideIcon };
const fallbackServices: PublicService[] = services;
function usePublicServices() {
  const [catalog, setCatalog] = useState<PublicService[]>(fallbackServices);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    (createClient().from("services") as any).select("slug,name,short_description,full_description,duration_minutes,mode,icon_name").eq("is_active", true).order("display_order").order("name").then(({ data }: { data: any[] | null }) => {
      if (data?.length) setCatalog(data.map((item) => ({ slug: item.slug, name: item.name, short: item.short_description, full: item.full_description, duration: `${item.duration_minutes} min`, mode: item.mode || "Online / domicilio / palestra del cliente", icon: item.icon_name === "laptop" ? Laptop : item.icon_name === "house" ? House : Dumbbell })));
    });
  }, []);
  return catalog;
}
function usePublicContent(defaults:Record<string,Record<string,string>>){const [content,setContent]=useState(defaults);const keys=Object.keys(defaults).join("|");useEffect(()=>{if(!isSupabaseConfigured())return;(createClient().from("site_content") as any).select("content_key,value").in("content_key",Object.keys(defaults)).eq("is_published",true).then(({data}:{data:any[]|null})=>{if(data?.length)setContent(current=>{const next={...current};for(const row of data)if(row.value&&typeof row.value==="object"&&!Array.isArray(row.value))next[row.content_key]={...next[row.content_key],...row.value};return next})})},[keys]);return content}

export function Home() {
  const catalog = usePublicServices();
  const content=usePublicContent({"home.hero":{eyebrow:"Personal Trainer · Online e in presenza",title:"Prenditi cura di te,",highlight:"un allenamento alla volta.",body:"Allenamento personalizzato, metodo e supporto costante per costruire risultati concreti e sostenibili.",primary:"Prenota una consulenza",secondary:"Scopri i servizi"},"home.intro":{title:"Allenarsi bene significa sentirsi capiti, prima ancora che guidati.",body:"Sono Francesco Crivello, Personal Trainer. Partiamo dall’ascolto, definiamo obiettivi realistici e costruiamo un percorso progressivo.",link:"Conosci Francesco"},"home.cta":{title:"Parliamo dei tuoi obiettivi.",body:"Una consulenza conoscitiva, senza pressioni, per capire insieme da dove partire.",button:"Prenota una consulenza"}});const hero=content["home.hero"],intro=content["home.intro"],cta=content["home.cta"];
  return (
    <>
      <section className="hero hero-branded">
        <div className="hero-media"><Image className="hero-image" src="/brand/francesco-crivello-hero.jpeg" alt="Francesco Crivello, Personal Trainer e Chinesiologo" fill priority sizes="(max-width: 800px) 100vw, 52vw" /></div>
        <Container className="hero-content">
          <div className="hero-copy">
            <Eyebrow tone="dark">{hero.eyebrow}</Eyebrow>
            <h1>{hero.title}<br /><em>{hero.highlight}</em></h1>
            <p>{hero.body}</p>
            <div className="hero-actions"><Button href="/prenota">{hero.primary}</Button><Button href="/servizi" variant="light">{hero.secondary}</Button></div>
            <div className="hero-trust"><span><ShieldCheck size={18} /> Percorso su misura</span><span><CalendarCheck size={18} /> Prenotazione semplice</span></div>
          </div>
        </Container>
        <a href="#inizia" className="scroll-cue" aria-label="Scorri alla presentazione"><ArrowDown size={18} /></a>
      </section>

      <section className="section intro-section" id="inizia">
        <Container>
          <div className="intro-grid">
            <div className="intro-statement"><span>01 — Il percorso</span><h2>{intro.title}</h2></div>
            <div className="intro-copy"><p>{intro.body}</p><Link href="/chi-sono" className="text-link">{intro.link} <ArrowRight size={16} /></Link></div>
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
          <div className="service-grid featured-services">{catalog.slice(0, 6).map((service, index) => <ServiceCard key={service.slug} service={service} index={index} />)}</div>
        </Container>
      </section>

      <MethodSection />

      <section className="section training-modes-section">
        <Container><SectionTitle eyebrow="Dove ci alleniamo" title={<>Il percorso viene da te,<br /><em>senza una sede fissa.</em></>} body="Scegliamo insieme la modalità più adatta: online, a domicilio oppure nella palestra che già frequenti." /><div className="training-mode-grid"><article><Laptop /><h3>Online</h3><p>Programmazione, coaching e check periodici per allenarti con continuità ovunque ti trovi.</p></article><article><House /><h3>A domicilio</h3><p>Sessioni concordate negli spazi disponibili, con organizzazione e attrezzatura definite in anticipo.</p></article><article><Dumbbell /><h3>Palestra del cliente</h3><p>Allenamenti presso la palestra che utilizzi abitualmente, previo accordo con la struttura.</p></article></div><div className="training-modes-action"><Button href="/contatti">Parliamo della modalità più adatta</Button></div></Container>
      </section>

      <section className="section testimonials-section">
        <Container><SectionTitle eyebrow="Esperienze" title={<>Il valore di sentirsi<br /><em>seguiti davvero.</em></>} body="Recensioni dimostrative. Le testimonianze reali saranno pubblicate solo con consenso esplicito." /><div className="testimonial-grid">{testimonials.map((item) => <article className="testimonial-card" key={item.name}><Quote size={28} /><div className="stars" aria-label="5 stelle">{[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}</div><blockquote>“{item.quote}”</blockquote><footer><span className="testimonial-avatar">{item.name[0]}</span><span><strong>{item.name}</strong><small>{item.meta}</small></span></footer></article>)}</div></Container>
      </section>

      <section className="cta-section"><Container><div><Eyebrow tone="dark">Il primo passo è semplice</Eyebrow><h2>{cta.title}</h2><p>{cta.body}</p></div><Button href="/prenota">{cta.button}</Button></Container></section>
    </>
  );
}

function ServiceCard({ service, index }: { service: PublicService; index: number }) {
  const Icon = service.icon;
  return <article className={`service-card ${index === 0 ? "service-card-highlight" : ""}`}><div className="service-card-top"><span className="service-icon"><Icon size={22} /></span><small>{String(index + 1).padStart(2, "0")}</small></div><h3>{service.name}</h3><p>{service.short}</p><div className="service-meta"><span>{service.duration}</span><i /><span>{service.mode}</span></div><Link href={`/servizi/${service.slug}`} aria-label={`Scopri ${service.name}`}><ArrowRight size={18} /></Link></article>;
}

export function ServicesPage() {
  const catalog = usePublicServices();
  return <><PageHero eyebrow="Servizi" title={<>Un allenamento che<br /><em>parla di te.</em></>} body="Ogni servizio è un punto di partenza. Il percorso viene poi adattato a obiettivi, esperienza e disponibilità." /><section className="section"><Container><div className="service-grid all-services">{catalog.map((service, index) => <ServiceCard key={service.slug} service={service} index={index} />)}</div></Container></section><ContactBand /></>;
}

export function ServiceDetail({ slug }: { slug: string }) {
  const catalog = usePublicServices();
  const service = catalog.find((item) => item.slug === slug) || catalog[0];
  if (!service) return null;
  const Icon = service.icon;
  return <><section className="detail-hero"><Container><Link className="back-link" href="/servizi">← Tutti i servizi</Link><div className="detail-hero-grid"><div><span className="large-service-icon"><Icon size={30} /></span><Eyebrow tone="dark">Percorso personalizzato</Eyebrow><h1>{service.name}</h1><p>{service.full || service.short} La proposta definitiva viene concordata dopo un colloquio conoscitivo.</p><div className="hero-actions"><Button href="/prenota">Prenota ora</Button><Button href="/contatti" variant="light">Richiedi informazioni</Button></div></div><div className="detail-summary"><div><small>Durata</small><strong>{service.duration}</strong></div><div><small>Modalità</small><strong>{service.mode}</strong></div><div><small>Prima di iniziare</small><strong>Colloquio + anamnesi</strong></div></div></div></Container></section><section className="section"><Container className="content-narrow"><SectionTitle eyebrow="Come funziona" title="Un percorso chiaro, dall’inizio." body="Questi contenuti sono modificabili dalla dashboard amministrativa." /><div className="detail-columns"><div><h3>Per chi è indicato</h3><CheckItem>Vuoi essere seguito con attenzione tecnica</CheckItem><CheckItem>Cerchi una programmazione sostenibile</CheckItem><CheckItem>Preferisci obiettivi concreti e verificabili</CheckItem><CheckItem>Vuoi allenarti con maggiore sicurezza</CheckItem></div><div><h3>Cosa include</h3><CheckItem>Colloquio e valutazione iniziale</CheckItem><CheckItem>Programmazione personalizzata</CheckItem><CheckItem>Monitoraggio dei progressi</CheckItem><CheckItem>Aggiornamenti periodici del percorso</CheckItem></div></div></Container></section><ContactBand /></>;
}

export function MethodSection() {
  return <section className="section method-section"><Container><SectionTitle eyebrow="Il metodo" light title={<>Otto passi. Un percorso<br /><em>costruito insieme.</em></>} body="Niente formule universali: partiamo dalla persona e adattiamo il lavoro lungo il cammino." /><div className="method-grid">{methodSteps.map(([num, title, body], index) => <article key={num} className={index < 2 ? "active" : ""}><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div><div className="method-action"><Button href="/metodo" variant="light">Approfondisci il metodo</Button></div></Container></section>;
}

export function MethodPage() {
  return <><PageHero eyebrow="Il metodo" title={<>Un processo solido.<br /><em>Mai rigido.</em></>} body="Il programma cambia con te: ascolto, dati utili e verifiche periodiche ci aiutano a prendere decisioni migliori." /><section className="section method-page"><Container><div className="timeline">{methodSteps.map(([num,title,body], index) => <article key={num}><div className="timeline-num">{num}</div><div><small>{index < 3 ? "Conoscere" : index < 6 ? "Costruire" : "Progredire"}</small><h2>{title}</h2><p>{body}</p></div></article>)}</div></Container></section><section className="notice-band"><Container><ShieldCheck size={30} /><div><strong>Sicurezza prima di tutto</strong><p>L’anamnesi orienta il percorso ma non sostituisce diagnosi, visite o indicazioni del medico.</p></div></Container></section></>;
}

export function AboutPage() {
  const content=usePublicContent({"about.main":{title:"Competenza, ascolto e un metodo che si adatta.",body:"Sono Francesco Crivello, Personal Trainer. Credo in un allenamento costruito con cura e sostenibile nella vita reale.",training:"Formazione professionale da completare.",certifications:"Certificazioni da completare.",philosophy:"Non inseguo scorciatoie. Costruiamo capacità, fiducia e abitudini che possano restare."}})["about.main"];
  return <><section className="about-hero"><Container><div className="about-photo"><Image src="/brand/francesco-crivello-hero.jpeg" alt="Francesco Crivello, Personal Trainer e Chinesiologo" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div><Eyebrow>Chi sono</Eyebrow><h1>{content.title}</h1><p>{content.body}</p><Button href="/prenota">Conosciamoci</Button></div></Container></section><section className="section"><Container><div className="about-grid"><div><SectionTitle eyebrow="Il profilo" title="Formazione e pratica, al servizio della persona." /><p className="large-copy">{content.body}</p></div><div className="credentials"><article><Award /><div><h3>Formazione</h3><p>{content.training}</p></div></article><article><ShieldCheck /><div><h3>Certificazioni</h3><p>{content.certifications}</p></div></article><article><Target /><div><h3>Specializzazioni</h3><p>Forza, ricomposizione, mobilità e preparazione atletica.</p></div></article><article><HeartHandshake /><div><h3>Persone seguite</h3><p>Principianti, sportivi amatoriali e persone che riprendono ad allenarsi.</p></div></article></div></div></Container></section><section className="philosophy"><Container><Sparkles /><blockquote>“{content.philosophy}”</blockquote><span>— Filosofia di allenamento</span></Container></section><ContactBand /></>;
}

export function ContactPage() {
  return <><PageHero eyebrow="Contatti e modalità" title={<>Allenati dove è<br /><em>più utile per te.</em></>} body="Percorsi online, sessioni a domicilio o allenamenti presso la palestra che già utilizzi, sempre previo accordo." /><section className="section"><Container><div className="training-mode-grid training-mode-grid-page"><article><Laptop /><h2>Online</h2><p>Coaching, programmazione e check in videochiamata per allenarti con autonomia e continuità.</p></article><article><House /><h2>A domicilio</h2><p>Definiamo insieme spazio, attrezzatura e organizzazione necessaria prima della sessione.</p></article><article><Dumbbell /><h2>Palestra del cliente</h2><p>Francesco può seguirti nella palestra che frequenti, compatibilmente con le regole della struttura.</p></article></div></Container></section><ContactForm /></>;
}

export function FaqPage() {
  return <><PageHero eyebrow="Domande frequenti" title={<>Prima di iniziare,<br /><em>tutto più chiaro.</em></>} body="Le risposte alle domande più comuni. Se non trovi ciò che cerchi, scrivimi." /><section className="section"><Container className="faq-wrap"><div className="faq-list">{faqs.map(([q,a], index) => <Faq key={q} question={q} answer={a} defaultOpen={index === 0} />)}</div><aside className="faq-aside"><MessageCircle size={26} /><h3>Hai un’altra domanda?</h3><p>Scrivimi: ti risponderò con tutte le informazioni utili, senza impegno.</p><Button href="/contatti">Contattami</Button></aside></Container></section></>;
}

function Faq({ question, answer, defaultOpen = false }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <article className={open ? "faq-item faq-open" : "faq-item"}><button onClick={() => setOpen(!open)} aria-expanded={open}><span>{question}</span><ChevronDown size={20} /></button>{open && <p>{answer}</p>}</article>;
}

export function PageHero({ eyebrow, title, body }: { eyebrow: string; title: React.ReactNode; body: string }) {
  return <section className="page-hero"><Container><Eyebrow tone="dark">{eyebrow}</Eyebrow><h1>{title}</h1><p>{body}</p></Container></section>;
}

export function ContactForm() {
  const catalog=usePublicServices();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Invio non riuscito.");
      setSent(true);
      event.currentTarget.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connessione non disponibile. Riprova.");
    } finally { setLoading(false); }
  }
  return <section className="section contact-section" id="contatti"><Container><div><Eyebrow>Parliamone</Eyebrow><h2>Raccontami da dove vuoi partire.</h2><p>Compila il modulo: riceverai una conferma e ti ricontatterò per capire insieme il passo successivo.</p><div className="direct-contacts"><a href="tel:+390000000000"><Phone /> +39 000 000 0000</a><a href="mailto:ciao@francescocrivello.it"><Mail /> ciao@francescocrivello.it</a><a href="#"><Instagram /> @francescocrivello.pt</a></div></div>{sent ? <div className="form-success"><CheckCircle2 size={42} /><h3>Richiesta inviata</h3><p>Grazie! La richiesta è stata registrata come “Nuova”.</p><button onClick={() => setSent(false)} className="button button-secondary">Invia un’altra richiesta</button></div> : <form className="contact-form" onSubmit={submit}>{error && <div className="legal-notice" role="alert"><ShieldCheck /><p>{error}</p></div>}<label className="field" aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}><span>Sito web</span><input name="website" tabIndex={-1} autoComplete="off" /></label><div className="form-grid"><Field label="Nome" name="firstName" required /><Field label="Cognome" name="lastName" required /><Field label="Email" name="email" type="email" required /><Field label="Telefono" name="phone" type="tel" required /><Select label="Servizio di interesse" name="service" options={catalog.slice(0,8).map(s => s.name)} /><Select label="Obiettivo principale" name="goal" options={["Benessere generale", "Forza", "Ricomposizione corporea", "Mobilità", "Preparazione sportiva"]} /><Select label="Modalità preferita" name="mode" options={["Online", "A domicilio", "Palestra del cliente", "Da definire"]} /><Select label="Fascia oraria" name="time" options={["Mattina", "Pausa pranzo", "Pomeriggio", "Sera"]} /></div><label className="field"><span>Messaggio</span><textarea name="message" rows={4} maxLength={2000} placeholder="Racconta brevemente cosa vorresti migliorare…" /></label><label className="checkbox"><input type="checkbox" name="privacy" required /><span>Ho letto la <Link href="/privacy" target="_blank" rel="noopener noreferrer">privacy policy</Link> e acconsento al trattamento dei dati.</span></label><label className="checkbox"><input type="checkbox" name="contactConsent" required /><span>Acconsento a essere ricontattato in merito a questa richiesta.</span></label><button className="button button-primary full-button" disabled={loading}>{loading ? "Invio in corso…" : "Invia la richiesta"}<ArrowRight size={17} /></button></form>}</Container></section>;
}

export function Field({ label, name, type = "text", required = false, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string }) {
  return <label className="field"><span>{label}{required && " *"}</span><input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="field"><span>{label}</span><select name={name} defaultValue=""><option value="" disabled>Seleziona</option>{options.map(o => <option key={o}>{o}</option>)}</select></label>;
}

export function ContactBand() {
  return <section className="contact-band"><Container><div><small>Non sai quale servizio scegliere?</small><h2>Partiamo da una conversazione.</h2></div><Button href="/contatti">Raccontami i tuoi obiettivi</Button></Container></section>;
}

export function LegalPage({ type }: { type: "privacy" | "cookie" | "terms" }) {
  const titles = { privacy: "Privacy policy", cookie: "Cookie policy", terms: "Termini e regolamento prenotazioni" };
  return <><PageHero eyebrow="Informazioni legali" title={<>{titles[type]}</>} body="Bozza professionale da far verificare e completare al titolare del trattamento e al consulente legale prima della pubblicazione." /><section className="section"><Container className="legal-copy"><div className="legal-notice"><ShieldCheck /><p><strong>Documento segnaposto.</strong> Versione demo 1.0 · ultimo aggiornamento 16 luglio 2026.</p></div>{type === "privacy" ? <><h2>1. Titolare del trattamento</h2><p>Francesco Crivello, [indirizzo e contatti completi da inserire].</p><h2>2. Dati trattati e finalità</h2><p>Dati di contatto per rispondere alle richieste; dati dell’account per erogare i servizi; dati relativi alla salute, solo con consenso esplicito, per personalizzare in sicurezza il percorso.</p><h2>3. Base giuridica e conservazione</h2><p>Consenso, esecuzione di misure precontrattuali e contratto. I tempi di conservazione sono definiti nel registro dei trattamenti e limitati al necessario.</p><h2>4. Diritti</h2><p>Accesso, rettifica, cancellazione, limitazione, portabilità e revoca del consenso possono essere richiesti dall’area personale o ai contatti indicati.</p></> : type === "cookie" ? <><h2>Cookie necessari</h2><p>Servono per sessione, sicurezza, preferenze privacy e funzionamento dei moduli. Non possono essere disattivati dal banner.</p><h2>Misurazione facoltativa</h2><p>Eventuali analytics sono caricati solo dopo consenso. Nessun dato sanitario viene inviato a sistemi pubblicitari o tracciamento.</p><h2>Gestione preferenze</h2><p>Puoi riaprire il pannello dal link “Gestisci cookie” nel footer.</p></> : <><h2>Prenotazioni</h2><p>Le sessioni possono essere modificate o annullate dall’area cliente fino a 24 ore prima, salvo condizioni diverse indicate nel servizio.</p><h2>Ritardi e assenze</h2><p>Le regole definitive, inclusi eventuali addebiti, devono essere accettate separatamente e restano sempre consultabili.</p><h2>Salute e responsabilità</h2><p>L’attività di personal training non sostituisce assistenza medica o fisioterapica. Può essere richiesto un certificato medico valido.</p></>}</Container></section></>;
}
