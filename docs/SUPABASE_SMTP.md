# SMTP esterno per Supabase Auth

Il sito continua a delegare password, conferma email e recupero accesso a Supabase Auth. Le credenziali SMTP non vanno inserite nel frontend, in Render o nel repository.

Nel dashboard Supabase aprire **Project Settings → Authentication → SMTP Settings**, attivare il mittente personalizzato e compilare:

- Host: valore fornito dal provider scelto (per esempio Resend).
- Port: porta TLS indicata dal provider.
- Username e password: credenziali SMTP del provider.
- Sender email: indirizzo o dominio verificato.
- Sender name: `Francesco Crivello Personal Trainer`.

In **Authentication → URL Configuration** mantenere come Site URL il dominio Render e tra i Redirect URLs:

- `http://localhost:3000/**`
- `https://francesco-crivello-pt.onrender.com/**`

In **Authentication → Email Templates** usare template Supabase con `{{ .ConfirmationURL }}` per conferma, invito e recupero. Non inviare mai password via email. Dopo l'attivazione eseguire una registrazione e un recupero password reali, controllando consegna e cartella spam.
