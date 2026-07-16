import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasValidOrigin } from "@/lib/security";

const allowedStatuses = ["new", "to_contact", "contacted", "consultation_booked", "converted", "not_interested", "archived"];

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  return data?.role === "admin" && data.is_active ? { supabase, user } : null;
}

export async function GET() {
  const admin = await adminClient();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const db = admin.supabase as any;
  const [inquiriesResult, orphanBookingsResult] = await Promise.all([
    db.from("inquiries").select("id,first_name,last_name,email,phone,service_interest,primary_goal,preferred_mode,preferred_time,message,status,admin_notes,requested_start,assigned_client_id,created_at,updated_at,services(name),locations(name,mode),appointments(id,status,starts_at,ends_at)").order("created_at", { ascending: false }),
    db.from("appointments").select("id,status,starts_at,ends_at,guest_first_name,guest_last_name,guest_email,guest_phone,client_notes,admin_notes,client_id,created_at,services(name),locations(name,mode)").is("inquiry_id", null).not("guest_email", "is", null).order("created_at", { ascending: false }),
  ]);
  if (inquiriesResult.error || orphanBookingsResult.error) {
    console.error("admin_requests_read_failed", { inquiries: inquiriesResult.error?.code, bookings: orphanBookingsResult.error?.code });
    return NextResponse.json({ error: "Richieste non disponibili." }, { status: 400 });
  }
  const inquiries = (inquiriesResult.data ?? []).map((item: any) => ({ ...item, kind: "inquiry", request_key: item.id, appointment: item.appointments?.[0] ?? null }));
  const orphanBookings = (orphanBookingsResult.data ?? []).map((item: any) => ({
    id: item.id, request_key: `booking-${item.id}`, kind: "booking", first_name: item.guest_first_name,
    last_name: item.guest_last_name, email: item.guest_email, phone: item.guest_phone,
    service_interest: item.services?.name, preferred_mode: item.locations?.name, message: item.client_notes,
    admin_notes: item.admin_notes, requested_start: item.starts_at, assigned_client_id: item.client_id,
    status: item.status === "confirmed" ? "consultation_booked" : item.status === "completed" ? "converted" : item.status.startsWith("cancelled") ? "archived" : "new",
    created_at: item.created_at, updated_at: item.created_at, appointment: item,
  }));
  return NextResponse.json({ requests: [...inquiries, ...orphanBookings].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) });
}

export async function PATCH(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await adminClient();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; kind?: string; status?: string; requestedStart?: string | null; adminNotes?: string; assignedClientId?: string | null; action?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  if (body.status && !allowedStatuses.includes(body.status)) return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  const db = admin.supabase as any;

  if (body.kind === "booking") {
    const update: Record<string, unknown> = {};
    if (body.adminNotes !== undefined) update.admin_notes = body.adminNotes.trim().slice(0, 4000) || null;
    if (body.assignedClientId !== undefined) update.client_id = body.assignedClientId || null;
    if (body.status) update.status = body.status === "consultation_booked" ? "confirmed" : body.status === "converted" ? "completed" : body.status === "archived" ? "cancelled_by_admin" : body.status === "not_interested" ? "cancelled_by_admin" : "pending";
    if (body.requestedStart) {
      const { data: current } = await db.from("appointments").select("service_id,services(duration_minutes)").eq("id", body.id).single();
      const start = new Date(body.requestedStart);
      if (!current || Number.isNaN(start.getTime())) return NextResponse.json({ error: "Data non valida." }, { status: 400 });
      update.starts_at = start.toISOString();
      update.ends_at = new Date(start.getTime() + Number(current.services?.duration_minutes ?? 60) * 60000).toISOString();
    }
    const { error } = await db.from("appointments").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.code === "23P01" ? "La fascia oraria è già occupata." : "Aggiornamento non riuscito." }, { status: 400 });
  } else {
    const update: Record<string, unknown> = {};
    if (body.status && body.action !== "confirm_appointment") update.status = body.status;
    if (body.requestedStart !== undefined) update.requested_start = body.requestedStart || null;
    if (body.adminNotes !== undefined) update.admin_notes = body.adminNotes.trim().slice(0, 4000) || null;
    if (body.assignedClientId !== undefined) update.assigned_client_id = body.assignedClientId || null;
    const { error } = await db.from("inquiries").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: "Aggiornamento non riuscito." }, { status: 400 });

    if (body.action === "confirm_appointment") {
      const { data: inquiry } = await db.from("inquiries").select("*,services(duration_minutes,buffer_minutes),appointments(id)").eq("id", body.id).single();
      if (!inquiry?.requested_start || !inquiry.service_id || !inquiry.location_id) return NextResponse.json({ error: "Imposta prima servizio, modalità, data e ora." }, { status: 400 });
      if (inquiry.appointments?.[0]?.id) {
        await db.from("appointments").update({ status: "confirmed", starts_at: inquiry.requested_start, ends_at: new Date(Date.parse(inquiry.requested_start) + Number(inquiry.services.duration_minutes) * 60000).toISOString() }).eq("id", inquiry.appointments[0].id);
      } else {
        const start = new Date(inquiry.requested_start);
        const { error: appointmentError } = await db.from("appointments").insert({ inquiry_id: inquiry.id, client_id: inquiry.assigned_client_id, service_id: inquiry.service_id, location_id: inquiry.location_id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + Number(inquiry.services.duration_minutes) * 60000).toISOString(), buffer_minutes: inquiry.services.buffer_minutes, status: "confirmed", guest_first_name: inquiry.first_name, guest_last_name: inquiry.last_name, guest_email: inquiry.email, guest_phone: inquiry.phone, created_by: admin.user.id });
        if (appointmentError) return NextResponse.json({ error: appointmentError.code === "23P01" ? "La fascia oraria è già occupata." : "Creazione appuntamento non riuscita." }, { status: 400 });
      }
      await db.from("inquiries").update({ status: "consultation_booked" }).eq("id", body.id);
    }
  }
  await db.from("activity_logs").insert({ actor_id: admin.user.id, action: body.action ?? "request_updated", entity_type: "request", entity_id: body.id, metadata: { kind: body.kind ?? "inquiry", status: body.status ?? null } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Origine non consentita." }, { status: 403 });
  const admin = await adminClient();
  if (!admin) return NextResponse.json({ error: "Accesso negato." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: string; kind?: string; hardDelete?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  const db = admin.supabase as any;
  const table = body.kind === "booking" ? "appointments" : "inquiries";
  const values = body.kind === "booking" ? { status: "cancelled_by_admin" } : { status: "archived" };
  const result = body.hardDelete ? await db.from(table).delete().eq("id", body.id) : await db.from(table).update(values).eq("id", body.id);
  if (result.error) return NextResponse.json({ error: "Operazione non riuscita." }, { status: 400 });
  await db.from("activity_logs").insert({ actor_id: admin.user.id, action: body.hardDelete ? "request_deleted" : "request_archived", entity_type: "request", entity_id: body.id });
  return NextResponse.json({ ok: true });
}
