# Francesco Crivello · Personal Trainer

Applicazione Next.js 15 responsive con sito pubblico, area cliente e pannello amministrativo. Il backend usa Supabase Auth, PostgreSQL con Row Level Security e Storage privato. Tutti i dati inclusi nel seed sono fittizi.

## Prerequisiti

- Node.js 20 o 22
- pnpm 9+
- progetto Supabase `hzlfknqnwzwmljpesytx`
- un Web Service Render (Next.js non è un export statico)

## Installazione e avvio locale

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Aprire `http://localhost:3000`. In `.env.local` sostituire `your_supabase_anon_key` con la chiave `anon/public` o `publishable` del progetto. La service-role non è necessaria per il sito normale e non deve mai essere esposta nel browser.

## Variabili ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://hzlfknqnwzwmljpesytx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Variabili server-side per le notifiche di prenotazione (nessuna deve avere il
prefisso `NEXT_PUBLIC_`):

```env
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_API_KEY=
EMAIL_FROM="Francesco Crivello <prenotazioni@dominio-verificato.it>"
ADMIN_NOTIFICATION_EMAIL=francescopaolo.crivello96@gmail.com
CRON_SECRET=
```

La prenotazione viene prima registrata su Supabase e solo dopo il server prova a
inviare la notifica tramite l'API Resend. Se `EMAIL_API_KEY` o `EMAIL_FROM`
mancano, l'appuntamento resta valido e la pagina di conferma comunica con
precisione che l'email non è partita. `EMAIL_FROM` deve usare un mittente o un
dominio verificato nel provider.

I file `.env`, `.env.local` e `.env.*.local` sono ignorati da Git; `.env.example` è tracciato.

## Database e Storage

La migrazione iniziale è [supabase/migrations/20260716180000_initial_secure_schema.sql](supabase/migrations/20260716180000_initial_secure_schema.sql). Crea profili, clienti, richieste, servizi, modalità/luoghi, disponibilità, eccezioni, appuntamenti, anamnesi, risposte, documenti, consensi, note admin, notifiche, recensioni, contenuti, richieste GDPR e log attività. La migrazione [supabase/migrations/20260716223000_brand_and_delivery_modes.sql](supabase/migrations/20260716223000_brand_and_delivery_modes.sql) sostituisce la sede fissa con le modalità online, a domicilio e palestra del cliente e aggiorna il contenuto hero.

Con Supabase CLI autenticata:

```bash
npx supabase@latest link --project-ref hzlfknqnwzwmljpesytx
npx supabase@latest db push
```

Poi, facoltativamente, eseguire [supabase/seed.sql](supabase/seed.sql) dal SQL Editor. Il seed contiene solo sedi e servizi dimostrativi.

La migrazione abilita RLS su tutte le tabelle. I visitatori possono soltanto creare richieste e consultare dati pubblici; ogni cliente vede il proprio profilo, appuntamenti, anamnesi e file; `admin_notes` resta solo admin. Il vincolo `EXCLUDE USING gist` impedisce sovrapposizioni anche in caso di richieste concorrenti.

Bucket creati dalla migrazione:

- `client-documents`: privato, PDF/JPG/PNG, massimo 10 MB;
- `progress-photos`: privato, JPG/PNG, massimo 10 MB;
- `site-assets`: pubblico, esclusivamente per contenuti approvati.

I file privati usano il percorso `<auth.uid()>/<uuid>.<estensione>` e vengono scaricati con signed URL di 60 secondi.

## Autenticazione e amministratori

Registrazione, verifica email, login, logout, recupero e cambio password usano Supabase Auth con callback PKCE. Il recupero porta a `/reset-password`, scambia il codice temporaneo con una sessione, aggiorna la password e torna al login. `middleware.ts` aggiorna la sessione e protegge `/cliente/*` e `/admin/*`; il ruolo admin è verificato anche da RLS.

La migrazione `20260717103000_authoritative_admin_allowlist.sql` limita il ruolo
amministratore, lato database, ai soli account:

- `francescopaolo.crivello96@gmail.com`
- `giuseppegalatolo24@gmail.com`

L’account viene promosso automaticamente quando Supabase Auth crea l’utente con
uno dei due indirizzi. Per revocare un amministratore senza modificare il codice,
eseguire nel SQL Editor:

```sql
update public.admin_allowlist
set is_active = false
where email = 'INDIRIZZO_AUTORIZZATO';
```

La revoca aggiorna immediatamente anche `profiles.role`; riattivare impostando
`is_active = true`. Non esiste una registrazione pubblica amministratore e il
middleware richiede MFA TOTP (AAL2) prima di accedere a `/admin`.

URL Auth da autorizzare in **Authentication → URL Configuration**:

- Site URL produzione: `https://francesco-crivello-pt.onrender.com`
- Redirect produzione: `https://francesco-crivello-pt.onrender.com/**`
- Redirect recupero produzione: `https://francesco-crivello-pt.onrender.com/reset-password`
- Redirect locale: `http://localhost:3000/**`
- Redirect recupero locale: `http://localhost:3000/reset-password`
- Preview, se usate: `https://*.onrender.com/**`

Ogni submit Auth emette nei log Render una coppia sicura
`[auth-diagnostic] start` e `success/error` con un ID casuale. Non vengono mai registrati
email, password, token o URL di recupero. Un solo `start` corrisponde a una sola
azione dell’utente verso Supabase Auth.

Il servizio SMTP integrato del progetto è attualmente limitato a **2 email/ora**:
questo è il motivo di `Email rate limit exceeded`. Il client impedisce doppi
submit, ma inviti, verifiche e recuperi condividono comunque quel limite. Non è
stato attivato un provider esterno, come richiesto; attendere il ripristino della
finestra prima di ripetere un test email.

## Build e deploy Render

Il repository include `render.yaml`. Configurazione corretta:

```text
Service type: Web Service
Build command: corepack enable && pnpm install --frozen-lockfile && pnpm build
Start command: pnpm start
Publish directory: nessuna
Health check: /api/health
```

Su Render aggiungere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_SITE_URL`, `ADMIN_NOTIFICATION_EMAIL`, `EMAIL_API_KEY` e
`EMAIL_FROM`. Le ultime tre sono server-side. Non aggiungere mai
`SUPABASE_SERVICE_ROLE_KEY` con prefisso `NEXT_PUBLIC_`.

## Verifiche

```bash
pnpm typecheck
pnpm build
pnpm start
```

La checklist funzionale è in [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md). Le verifiche RLS complete richiedono due account client distinti e un account admin nel progetto Supabase remoto.

## Mappa principale

| Pubblico | Cliente | Admin |
| --- | --- | --- |
| `/`, `/chi-sono`, `/servizi`, `/metodo` | `/cliente` | `/admin` |
| `/contatti`, `/faq`, `/prenota` | `/cliente/calendario` | `/admin/richieste` |
| `/login`, `/registrazione`, `/recupera-password`, `/reset-password` | `/cliente/anamnesi` | `/admin/clienti/[id]` |
| privacy, cookie e termini | `/cliente/documenti`, `/cliente/profilo` | calendario, disponibilità, servizi, contenuti, impostazioni |

## Sicurezza e privacy

- Password e verifica email sono gestite da Supabase Auth; nessuna password è salvata dall’app.
- Nessun dato sanitario viene scritto in URL, log frontend o `localStorage`.
- RLS e funzioni `security definer` limitate applicano l’autorizzazione nel database.
- Note admin e documenti sanitari non sono pubblici.
- Le richieste pubbliche hanno validazione, honeypot e rate limiting applicativo. Per più istanze Render, sostituire il contatore in memoria con Redis/Upstash e aggiungere Turnstile.
- La notifica amministratore della nuova prenotazione è tentata subito dal server dopo il commit sul database. Le conferme e i promemoria accodati in `notifications` restano disponibili per il worker `pnpm notifications:run`; il Blueprint non crea Cron Job a pagamento.
- Privacy policy, consensi, conservazione e termini sono bozze da validare con il consulente legale/DPO prima del go-live.
- Configurare backup/PITR, test di ripristino e MFA admin dal piano Supabase scelto.

## Troubleshooting GitHub

Git traccia i file che iniziano con `.`; sono solo nascosti in alcuni file manager. Non traccia cartelle vuote. `.env.example` deve essere committato, mentre `.env.local` deve restare ignorato. Usare:

```bash
git status --ignored
git check-ignore -v .env.local
git ls-files .env.example render.yaml supabase/migrations
```

Se GitHub mostra una copia diversa, controllare branch e remote: questo progetto deve usare `main` e `origin=https://github.com/giuseppegalatolo19/Cicciopt.git`.
