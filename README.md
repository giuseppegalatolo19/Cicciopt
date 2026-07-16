# Francesco Crivello · Personal Trainer

Sito professionale responsive con area pubblica, portale cliente e dashboard amministrativa. L’interfaccia include dati demo chiaramente fittizi e funziona anche senza servizi esterni; collegando Supabase, le API di richieste e prenotazioni usano lo schema PostgreSQL incluso.

## Avvio locale

Requisiti: Node.js 20+ e pnpm 9+.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Aprire `http://localhost:3000`. Gli accessi demo sono precompilati in `/login`: selezionare **Cliente** o **Amministratore** e premere “Accedi”. Non sono credenziali reali e in demo il ruolo è conservato solo nel browser.

## Mappa delle pagine

| Area pubblica | Area cliente | Area admin |
| --- | --- | --- |
| `/` Home | `/cliente` Dashboard | `/admin` Dashboard |
| `/chi-sono` | `/cliente/calendario` | `/admin/richieste` |
| `/servizi` e `/servizi/[slug]` | `/cliente/anamnesi` | `/admin/clienti` e dettaglio |
| `/metodo` | `/cliente/documenti` | `/admin/calendario` |
| `/sede-contatti` | `/cliente/profilo` | `/admin/disponibilita` |
| `/prenota` e conferma | | `/admin/servizi` |
| `/faq` | | `/admin/contenuti` |
| login, registrazione, recupero | | `/admin/impostazioni` |
| privacy, cookie, termini, 404 | | |

## Funzioni incluse

- Modulo contatti con validazione, rate limiting, stato iniziale `new` e fallback demo locale.
- Prenotazione in tre passaggi; mostra solo slot disponibili, memorizza gli slot demo occupati e impedisce una seconda selezione.
- Schema SQL con vincolo PostgreSQL anti-sovrapposizione, disponibilità ricorrente/eccezioni, anticipo minimo, limite giornaliero e fuso `Europe/Rome`.
- Anamnesi mobile-first in sei passaggi, avviso sanitario, PAR-Q ispirato e consensi separati/versionati.
- Dashboard cliente con appuntamenti, documenti, profilo, storico e richieste GDPR.
- Dashboard admin con richieste, clienti, note private, alert sanitari, calendario, disponibilità, servizi e CMS.
- SEO di base, Open Graph, sitemap, robots, banner cookie e stati vuoti/errore curati.

## Supabase

1. Creare un progetto Supabase in una regione UE appropriata.
2. Eseguire `supabase/schema.sql` nel SQL Editor, poi `supabase/seed.sql`.
3. Copiare URL, anon key e service-role key in `.env.local`. La service-role key deve restare esclusivamente lato server.
4. In Authentication abilitare verifica email, recovery password e MFA TOTP. L’admin va creato manualmente, con `profiles.role = 'admin'`; non esiste registrazione pubblica admin.
5. Creare bucket privati `client-documents` e `progress-photos`; i percorsi devono includere il `client_id`. Generare soltanto signed URL brevi dopo un controllo di ruolo/proprietà.
6. Collegare un provider email transazionale e un job schedulato protetto da `CRON_SECRET` per processare `notifications` (conferma, 24 ore, promemoria breve, modifica, cancellazione).

Le policy RLS in `schema.sql` isolano ogni cliente tramite `auth.uid()` e consentono l’accesso globale solo al ruolo admin. Le note admin non hanno alcuna policy cliente. La funzione di prenotazione è chiamabile soltanto dalla service role attraverso l’API server.

## Autenticazione di produzione

La UI demo simula la scelta del ruolo per rendere il prototipo immediatamente esplorabile. Prima della pubblicazione sostituire il submit demo con Supabase Auth (`signInWithPassword`, invito, verifica email, reset password), impostare cookie HttpOnly/Secure/SameSite e aggiungere middleware server che blocchi `/cliente/*` e `/admin/*`. L’autorizzazione reale resta comunque nel database tramite RLS; il solo routing client non deve mai essere considerato una protezione.

## Sicurezza e GDPR prima del go-live

- Far revisionare privacy, cookie, termini, consensi e tempi di conservazione da un professionista.
- Usare MFA obbligatoria per Francesco, password Argon2/bcrypt gestite da Supabase Auth e rotazione delle chiavi.
- Cifrare backup e campi sanitari particolarmente sensibili con KMS/column encryption; non registrarli in log, analytics o strumenti pubblicitari.
- Configurare CSP, CSRF protection per le operazioni con cookie, CAPTCHA/turnstile sui form pubblici e rate limiting condiviso (Redis/Upstash), non in memoria.
- Attivare backup, PITR, audit periodico delle policy RLS, alert sugli accessi e test di ripristino.
- Applicare minimizzazione, scadenza documenti, revoca consensi e workflow verificato per export/anonimizzazione.
- Pubblicare foto, recensioni e progressi solo con consenso esplicito separato e revocabile.

## Pubblicazione

1. Eseguire `pnpm typecheck` e `pnpm build`.
2. Importare il repository su Vercel o altro host Node compatibile.
3. Configurare tutte le variabili di `.env.example` nell’ambiente di produzione.
4. Impostare dominio e `NEXT_PUBLIC_SITE_URL`, quindi verificare email, sitemap, cookie e redirect HTTPS.
5. Eseguire i test di accettazione descritti in `docs/ACCEPTANCE.md` su mobile e desktop.

L’immagine hero è stata generata appositamente per questo progetto e si trova in `public/images/francesco-hero.png`. Va sostituita con una foto reale di Francesco prima della pubblicazione.
