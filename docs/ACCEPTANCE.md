# Verifica di accettazione

## Visitatore

1. Aprire `/sede-contatti`, compilare i campi e i due consensi, inviare.
2. Verificare la conferma visiva e una riga `inquiries.status = 'new'` con Supabase configurato.
3. Aprire `/prenota`, scegliere servizio, sede, data e ora; confermare.
4. Ripetere il flusso e verificare che lo slot appena occupato non sia selezionabile.

## Cliente

1. Autenticarsi con un account cliente verificato e aprire `/cliente`.
2. Verificare che query dirette verso `clients`, `appointments`, `anamneses`, `documents` di un altro `client_id` restituiscano zero righe o 403.
3. Compilare tutti i passaggi dell’anamnesi da uno schermo 360 px; ricaricare e verificare il salvataggio.
4. Modificare/annullare un appuntamento oltre e dentro il limite; il server deve accettare solo il secondo caso.
5. Richiedere export e cancellazione dati, verificando creazione del workflow amministrativo.

## Amministratore

1. Verificare email, password e MFA; accedere a `/admin`.
2. Filtrare richieste, cambiare stato e convertire una richiesta in cliente.
3. Aprire la scheda cliente e verificare anamnesi, alert, documenti, consensi e note private.
4. Creare due appuntamenti sovrapposti: il secondo deve fallire con conflitto anche usando direttamente l’API.
5. Aggiungere chiusura/eccezione e verificare che gli slot spariscano dalla pagina pubblica.
6. Modificare contenuto/servizio e verificare anteprima e pubblicazione.

## Qualità

- Viewport: 360×800, 768×1024, 1280×800, 1440×900.
- Navigazione completa con tastiera, focus visibile, label associate, contrasto WCAG AA.
- Nessun dato sanitario in analytics, URL, email di marketing o log applicativi.
- Test recovery, verifica email, timeout sessione, revoca MFA, backup e ripristino.
- Lighthouse: performance e accessibilità da ottimizzare con dati/hosting definitivi.
