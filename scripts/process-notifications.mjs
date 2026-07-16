import { createClient } from "@supabase/supabase-js";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "EMAIL_API_KEY", "EMAIL_FROM"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Variabile ${name} mancante.`);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: notifications, error } = await supabase.from("notifications")
  .select("id,appointment_id,recipient_email,template,payload")
  .eq("channel", "email").eq("status", "queued").lte("scheduled_for", new Date().toISOString())
  .order("scheduled_for").limit(50);
if (error) throw error;

const templates = {
  inquiry_confirmation: ["Richiesta ricevuta", "Grazie per aver contattato Francesco Crivello. La richiesta è stata registrata e riceverai un riscontro appena possibile."],
  new_inquiry_admin: ["Nuova richiesta dal sito", "È arrivata una nuova richiesta. Accedi alla dashboard amministrativa per gestirla."],
  booking_confirmation: ["Prenotazione confermata", "La prenotazione è stata registrata. Trovi i dettagli nella tua area personale."],
  booking_reminder_24h: ["Promemoria appuntamento", "Il tuo appuntamento con Francesco è previsto tra circa 24 ore."],
  booking_reminder_short: ["Appuntamento in arrivo", "Mancano poche ore al tuo appuntamento con Francesco."],
  booking_change: ["Prenotazione modificata", "La prenotazione è stata modificata. Controlla i dettagli aggiornati nella tua area personale."],
  booking_cancellation: ["Prenotazione annullata", "La prenotazione è stata annullata. Puoi consultare lo storico nella tua area personale."],
};

for (const notification of notifications ?? []) {
  const recipient = notification.template === "new_inquiry_admin"
    ? process.env.ADMIN_NOTIFICATION_EMAIL
    : notification.recipient_email;
  if (!recipient) {
    await supabase.from("notifications").update({ status: "failed", error: "recipient_missing" }).eq("id", notification.id);
    continue;
  }
  const [subject, text] = templates[notification.template] ?? ["Comunicazione", "Hai una nuova comunicazione nella tua area personale."];
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [recipient], subject, text }),
  });
  await supabase.from("notifications").update(response.ok
    ? { status: "sent", sent_at: new Date().toISOString(), error: null }
    : { status: "failed", error: `provider_http_${response.status}` }
  ).eq("id", notification.id);
}

console.log(`Notifiche elaborate: ${notifications?.length ?? 0}`);
