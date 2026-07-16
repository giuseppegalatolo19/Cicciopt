import {
  Activity,
  BicepsFlexed,
  CalendarDays,
  Dumbbell,
  HeartPulse,
  Laptop,
  Move3D,
  RefreshCw,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";

export const services = [
  {
    slug: "personal-training",
    name: "Personal training individuale",
    short: "Un percorso costruito su obiettivi, disponibilità e livello di partenza.",
    duration: "55 min",
    mode: "A domicilio / palestra cliente",
    icon: Dumbbell,
  },
  {
    slug: "duo-training",
    name: "Allenamento in coppia",
    short: "Metodo personalizzato e motivazione condivisa, senza perdere attenzione tecnica.",
    duration: "60 min",
    mode: "A domicilio / palestra cliente",
    icon: Users,
  },
  {
    slug: "ricomposizione",
    name: "Ricomposizione corporea",
    short: "Allenamento progressivo per migliorare composizione, energia e abitudini.",
    duration: "Percorso 8–12 sett.",
    mode: "Online / in presenza",
    icon: Scale,
  },
  {
    slug: "forza",
    name: "Forza e massa muscolare",
    short: "Programmazione misurabile, tecnica solida e carichi adeguati al tuo livello.",
    duration: "55 min",
    mode: "Palestra del cliente",
    icon: BicepsFlexed,
  },
  {
    slug: "preparazione-atletica",
    name: "Preparazione atletica",
    short: "Capacità condizionali e gesti utili allo sport, con progressioni sostenibili.",
    duration: "60 min",
    mode: "Palestra cliente / outdoor",
    icon: Activity,
  },
  {
    slug: "mobilita",
    name: "Mobilità e funzionalità",
    short: "Muoversi meglio nella vita e nell’allenamento con un lavoro graduale e mirato.",
    duration: "45 min",
    mode: "Online / a domicilio",
    icon: Move3D,
  },
  {
    slug: "programmazione",
    name: "Programmazione allenamento",
    short: "Una scheda chiara, spiegata e aggiornata sulla base dei tuoi progressi.",
    duration: "4 settimane",
    mode: "Online",
    icon: CalendarDays,
  },
  {
    slug: "coaching-online",
    name: "Coaching online",
    short: "Programma, check periodici e supporto per allenarti con autonomia e continuità.",
    duration: "Mensile",
    mode: "Online",
    icon: Laptop,
  },
  {
    slug: "valutazione",
    name: "Valutazione iniziale",
    short: "Colloquio, anamnesi e test di base per definire una partenza consapevole.",
    duration: "75 min",
    mode: "Online / in presenza",
    icon: HeartPulse,
  },
  {
    slug: "monitoraggio",
    name: "Monitoraggio progressi",
    short: "Verifiche periodiche per leggere i dati e adattare il programma senza fretta.",
    duration: "30 min",
    mode: "Online / in presenza",
    icon: TrendingUp,
  },
].map((service) => ({ ...service, price: "" }));

export const methodSteps = [
  ["01", "Primo contatto", "Raccontami cosa vuoi migliorare e quali sono le tue esigenze."],
  ["02", "Colloquio conoscitivo", "Facciamo chiarezza su obiettivi, esperienza e disponibilità."],
  ["03", "Anamnesi", "Raccogliamo in modo riservato le informazioni utili alla sicurezza."],
  ["04", "Valutazione iniziale", "Osserviamo mobilità, capacità attuali e punti di partenza."],
  ["05", "Obiettivi", "Definiamo traguardi realistici, misurabili e compatibili con la tua vita."],
  ["06", "Programma", "Costruisco il percorso e ti spiego il perché di ogni scelta."],
  ["07", "Allenamento", "Lavoriamo con tecnica, progressione e feedback costante."],
  ["08", "Verifica", "Controlliamo i risultati e adattiamo il programma nel tempo."],
];

export const testimonials = [
  {
    quote: "Ho trovato un metodo chiaro e sostenibile. Ogni esercizio ha un perché e mi sento seguita senza pressioni.",
    name: "Giulia M.",
    meta: "Percorso forza · recensione demo",
  },
  {
    quote: "Francesco ascolta davvero. Abbiamo adattato il lavoro ai miei ritmi e oggi mi muovo con molta più sicurezza.",
    name: "Marco R.",
    meta: "Mobilità · recensione demo",
  },
  {
    quote: "Il monitoraggio è concreto e mai ossessivo. Vedo i progressi e so su cosa stiamo lavorando.",
    name: "Elena P.",
    meta: "Coaching online · recensione demo",
  },
];

export const faqs = [
  ["È necessaria esperienza in palestra?", "No. Il percorso parte dal tuo livello e ogni esercizio viene spiegato e adattato."],
  ["Come si svolge la prima consulenza?", "È un colloquio di circa 30 minuti, online o nella modalità concordata, per capire esigenze, obiettivi e fattibilità del percorso."],
  ["Quanto dura una sessione?", "La maggior parte delle sessioni dura 55–60 minuti. Durata e buffer sono sempre indicati in fase di prenotazione."],
  ["È possibile allenarsi online?", "Sì. Sono disponibili programmazione e coaching online con check periodici."],
  ["Posso modificare o annullare una prenotazione?", "Sì, dall’area cliente fino a 24 ore prima. Oltre tale limite è necessario contattare Francesco."],
  ["Serve un certificato medico?", "Può essere richiesto in base all’attività e alle condizioni personali. In caso di dubbi è sempre opportuno confrontarsi con il medico."],
  ["Come vengono monitorati i progressi?", "Con indicatori concordati: qualità del movimento, carichi, continuità, misure facoltative e percezioni personali."],
  ["È possibile allenarsi in coppia?", "Sì, quando obiettivi e livello consentono un lavoro efficace per entrambe le persone."],
];

export const navLinks = [
  ["Chi sono", "/chi-sono"],
  ["Servizi", "/servizi"],
  ["Metodo", "/metodo"],
  ["Contatti", "/contatti"],
  ["FAQ", "/faq"],
];

export const adminNav = [
  ["Panoramica", "/admin"],
  ["Richieste", "/admin/richieste"],
  ["Clienti", "/admin/clienti"],
  ["Calendario", "/admin/calendario"],
  ["Disponibilità", "/admin/disponibilita"],
  ["Servizi", "/admin/servizi"],
  ["Contenuti", "/admin/contenuti"],
  ["Impostazioni", "/admin/impostazioni"],
];

export const clientNav = [
  ["Panoramica", "/cliente"],
  ["Calendario", "/cliente/calendario"],
  ["Anamnesi", "/cliente/anamnesi"],
  ["Documenti", "/cliente/documenti"],
  ["Profilo", "/cliente/profilo"],
];

export const demoRequests = [
  { name: "Alice Moretti", service: "Valutazione iniziale", date: "16 lug, 09:42", status: "Nuova", email: "alice.demo@example.it" },
  { name: "Luca Bianchi", service: "Coaching online", date: "15 lug, 18:10", status: "Da contattare", email: "luca.demo@example.it" },
  { name: "Marta Piras", service: "Personal training", date: "14 lug, 11:25", status: "Consulenza fissata", email: "marta.demo@example.it" },
  { name: "Davide Riva", service: "Forza e massa", date: "13 lug, 16:50", status: "Contattata", email: "davide.demo@example.it" },
];

export const demoClients = [
  { name: "Sofia Romani", goal: "Forza e benessere", next: "Oggi, 17:30", flags: "Spalla dx", status: "Attivo" },
  { name: "Andrea Sala", goal: "Ricomposizione", next: "18 lug, 10:00", flags: "—", status: "Attivo" },
  { name: "Elisa Conti", goal: "Mobilità", next: "21 lug, 18:30", flags: "Lombalgia riferita", status: "Attivo" },
  { name: "Tommaso Greco", goal: "Preparazione atletica", next: "Da pianificare", flags: "Certificato in scadenza", status: "Invitato" },
];

export const slots = [
  { day: "Lun", date: "20", iso: "2026-07-20", full: "Lunedì 20 luglio", times: ["08:00", "09:00", "11:30", "17:30"] },
  { day: "Mar", date: "21", iso: "2026-07-21", full: "Martedì 21 luglio", times: ["09:00", "10:00", "16:30", "18:30"] },
  { day: "Mer", date: "22", iso: "2026-07-22", full: "Mercoledì 22 luglio", times: ["08:00", "12:30", "17:30", "19:30"] },
  { day: "Gio", date: "23", iso: "2026-07-23", full: "Giovedì 23 luglio", times: ["10:00", "11:00", "15:30", "18:30"] },
  { day: "Ven", date: "24", iso: "2026-07-24", full: "Venerdì 24 luglio", times: ["08:00", "09:00", "13:30", "16:30"] },
];

export const anamnesisSteps = ["Dati personali", "Obiettivi", "Stile di vita", "Esperienza", "Salute", "Consensi"];

export const RefreshIcon = RefreshCw;
