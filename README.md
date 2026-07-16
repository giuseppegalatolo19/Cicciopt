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

Opzionali, esclusivamente server-side per job futuri:

```env
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_API_KEY=
EMAIL_FROM="Francesco Crivello <appuntamenti@example.it>"
ADMIN_NOTIFICATION_EMAIL=
CRON_SECRET=
```

I file `.env`, `.env.local` e `.env.*.local` sono ignorati da Git; `.env.example` è tracciato.

## Database e Storage

La migrazione iniziale è [supabase/migrations/20260716180000_initial_secure_schema.sql](supabase/migrations/20260716180000_initial_secure_schema.sql). Crea profili, clienti, richieste, servizi, sedi, disponibilità, eccezioni, appuntamenti, anamnesi, risposte, documenti, consensi, note admin, notifiche, recensioni, contenuti, richieste GDPR e log attività.

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

## Autenticazione e amministratore

Registrazione, verifica email, login, logout, recupero e cambio password usano Supabase Auth con callback PKCE. `middleware.ts` aggiorna la sessione e protegge `/cliente/*` e `/admin/*`; il ruolo admin è verificato anche da RLS.

Dopo avere creato manualmente l’account di Francesco in **Authentication → Users**, assegnare il ruolo con il suo UUID reale:

```sql
update public.profiles
set role = 'admin', first_name = 'Francesco', last_name = 'Crivello'
where id = 'UUID_REALE_DI_AUTH_USERS';
```

Non esiste una registrazione pubblica amministratore. Per l’admin è raccomandato abilitare MFA TOTP dal dashboard Supabase.

URL Auth da autorizzare in **Authentication → URL Configuration**:

- Site URL locale: `http://localhost:3000`
- Redirect locale: `http://localhost:3000/auth/callback`
- Site URL produzione: `https://IL-TUO-SERVIZIO.onrender.com`
- Redirect produzione: `https://IL-TUO-SERVIZIO.onrender.com/auth/callback`
- Preview, se usate: `https://*.onrender.com/auth/callback`

## Build e deploy Render

Il repository include `render.yaml`. Configurazione corretta:

```text
Service type: Web Service
Build command: corepack enable && pnpm install --frozen-lockfile && pnpm build
Start command: pnpm start
Publish directory: nessuna
Health check: /api/health
```

Su Render aggiungere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`. Non aggiungere `SUPABASE_SERVICE_ROLE_KEY` con prefisso `NEXT_PUBLIC_`.

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
| `/sede-contatti`, `/faq`, `/prenota` | `/cliente/calendario` | `/admin/richieste` |
| `/login`, `/registrazione`, recupero | `/cliente/anamnesi` | `/admin/clienti/[id]` |
| privacy, cookie e termini | `/cliente/documenti`, `/cliente/profilo` | calendario, disponibilità, servizi, contenuti, impostazioni |

## Sicurezza e privacy

- Password e verifica email sono gestite da Supabase Auth; nessuna password è salvata dall’app.
- Nessun dato sanitario viene scritto in URL, log frontend o `localStorage`.
- RLS e funzioni `security definer` limitate applicano l’autorizzazione nel database.
- Note admin e documenti sanitari non sono pubblici.
- Le richieste pubbliche hanno validazione, honeypot e rate limiting applicativo. Per più istanze Render, sostituire il contatore in memoria con Redis/Upstash e aggiungere Turnstile.
- Le notifiche vengono accodate in `notifications`; il Cron Job definito in `render.yaml` le invia tramite Resend ogni 5 minuti. Configurare le cinque variabili private del job prima di abilitarlo.
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
