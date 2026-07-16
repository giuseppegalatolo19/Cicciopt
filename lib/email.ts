type BookingEmailInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  serviceName: string;
  locationName: string;
  startsAt: Date;
  bookingId: string;
};

export type EmailDeliveryStatus = "sent" | "failed" | "not_configured";

export async function sendBookingAdminEmail(input: BookingEmailInput): Promise<EmailDeliveryStatus> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !from || !recipient) return "not_configured";

  const appointment = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    dateStyle: "full",
    timeStyle: "short",
  }).format(input.startsAt);
  const text = [
    "È stata registrata una nuova prenotazione dal sito.",
    "",
    `Cliente: ${input.firstName} ${input.lastName}`,
    `Email: ${input.email}`,
    `Telefono: ${input.phone || "non indicato"}`,
    `Servizio: ${input.serviceName}`,
    `Modalità: ${input.locationName}`,
    `Data e ora: ${appointment}`,
    `Codice: ${input.bookingId.slice(0, 8).toUpperCase()}`,
    "",
    "Apri la dashboard amministrativa per visualizzare e gestire l’appuntamento.",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `Nuova prenotazione · ${input.serviceName}`,
        text,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error("Booking notification provider rejected the request", { status: response.status });
      return "failed";
    }
    return "sent";
  } catch (cause) {
    console.error("Booking notification delivery failed", {
      reason: cause instanceof Error ? cause.name : "unknown_error",
    });
    return "failed";
  }
}
