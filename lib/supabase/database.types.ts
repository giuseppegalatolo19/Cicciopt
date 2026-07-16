export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Row<{ id: string; email: string | null; role: "client" | "admin"; first_name: string; last_name: string; phone: string | null; timezone: string; is_active: boolean; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["profiles"]["Row"]>; Update: Update<Database["public"]["Tables"]["profiles"]["Row"]>; Relationships: [] };
      clients: { Row: Row<{ id: string; profile_id: string | null; invited_email: string | null; account_status: string; primary_goal: string | null; next_action: string | null; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["clients"]["Row"]>; Update: Update<Database["public"]["Tables"]["clients"]["Row"]>; Relationships: [] };
      inquiries: { Row: Row<{ id: string; first_name: string; last_name: string; email: string; phone: string | null; service_interest: string | null; primary_goal: string | null; preferred_mode: string | null; preferred_time: string | null; message: string | null; status: string; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["inquiries"]["Row"]>; Update: Update<Database["public"]["Tables"]["inquiries"]["Row"]>; Relationships: [] };
      services: { Row: Row<{ id: string; name: string; slug: string; short_description: string; full_description: string | null; duration_minutes: number; buffer_minutes: number; price_cents: number | null; is_active: boolean; bookable_online: boolean; manual_approval: boolean; max_participants: number }>; Insert: Insert<Database["public"]["Tables"]["services"]["Row"]>; Update: Update<Database["public"]["Tables"]["services"]["Row"]>; Relationships: [] };
      locations: { Row: Row<{ id: string; name: string; slug: string; address: string | null; city: string | null; mode: string; is_active: boolean }>; Insert: Insert<Database["public"]["Tables"]["locations"]["Row"]>; Update: Update<Database["public"]["Tables"]["locations"]["Row"]>; Relationships: [] };
      appointments: { Row: Row<{ id: string; client_id: string | null; service_id: string; location_id: string; starts_at: string; ends_at: string; status: string; client_notes: string | null; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["appointments"]["Row"]>; Update: Update<Database["public"]["Tables"]["appointments"]["Row"]>; Relationships: [] };
      anamneses: { Row: Row<{ id: string; client_id: string; version: number; status: string; completion_percent: number; submitted_at: string | null; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["anamneses"]["Row"]>; Update: Update<Database["public"]["Tables"]["anamneses"]["Row"]>; Relationships: [] };
      anamnesis_answers: { Row: Row<{ id: string; anamnesis_id: string; section: string; question_key: string; answer: Json; is_health_data: boolean; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["anamnesis_answers"]["Row"]>; Update: Update<Database["public"]["Tables"]["anamnesis_answers"]["Row"]>; Relationships: [] };
      documents: { Row: Row<{ id: string; client_id: string; kind: string; title: string; storage_path: string; mime_type: string; size_bytes: number; is_visible_to_client: boolean; created_at: string }>; Insert: Insert<Database["public"]["Tables"]["documents"]["Row"]>; Update: Update<Database["public"]["Tables"]["documents"]["Row"]>; Relationships: [] };
      consents: { Row: Row<{ id: string; client_id: string; consent_type: string; document_version: string; granted: boolean; granted_at: string; revoked_at: string | null; metadata: Json }>; Insert: Insert<Database["public"]["Tables"]["consents"]["Row"]>; Update: Update<Database["public"]["Tables"]["consents"]["Row"]>; Relationships: [] };
      admin_notes: { Row: Row<{ id: string; client_id: string; author_id: string; body: string; created_at: string; updated_at: string }>; Insert: Insert<Database["public"]["Tables"]["admin_notes"]["Row"]>; Update: Update<Database["public"]["Tables"]["admin_notes"]["Row"]>; Relationships: [] };
      availability_rules: { Row: Row<{ id: string; location_id: string; service_id: string | null; iso_weekday: number; start_time: string; end_time: string; is_active: boolean }>; Insert: Insert<Database["public"]["Tables"]["availability_rules"]["Row"]>; Update: Update<Database["public"]["Tables"]["availability_rules"]["Row"]>; Relationships: [] };
      availability_exceptions: { Row: Row<{ id: string; location_id: string | null; starts_at: string; ends_at: string; kind: string; reason: string | null }>; Insert: Insert<Database["public"]["Tables"]["availability_exceptions"]["Row"]>; Update: Update<Database["public"]["Tables"]["availability_exceptions"]["Row"]>; Relationships: [] };
      booking_settings: { Row: Row<{ id: boolean; timezone: string; min_notice_hours: number; cancellation_limit_hours: number; max_days_ahead: number; max_daily_appointments: number; second_reminder_hours: number }>; Insert: Insert<Database["public"]["Tables"]["booking_settings"]["Row"]>; Update: Update<Database["public"]["Tables"]["booking_settings"]["Row"]>; Relationships: [] };
      notifications: { Row: Row<{ id: string; profile_id: string | null; appointment_id: string | null; channel: string; template: string; scheduled_for: string; status: string; created_at: string }>; Insert: Insert<Database["public"]["Tables"]["notifications"]["Row"]>; Update: Update<Database["public"]["Tables"]["notifications"]["Row"]>; Relationships: [] };
      reviews: { Row: Row<{ id: string; display_name: string; quote: string; rating: number | null; published: boolean; explicit_publication_consent: boolean }>; Insert: Insert<Database["public"]["Tables"]["reviews"]["Row"]>; Update: Update<Database["public"]["Tables"]["reviews"]["Row"]>; Relationships: [] };
      site_content: { Row: Row<{ id: string; content_key: string; locale: string; value: Json; is_published: boolean }>; Insert: Insert<Database["public"]["Tables"]["site_content"]["Row"]>; Update: Update<Database["public"]["Tables"]["site_content"]["Row"]>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      create_public_booking: { Args: { p_service_id: string; p_location_id: string; p_starts_at: string; p_first_name: string; p_last_name: string; p_email: string; p_phone: string; p_notes?: string | null }; Returns: string };
      get_available_slots: { Args: { p_service_id: string; p_location_id: string; p_day: string }; Returns: { starts_at: string; ends_at: string }[] };
      cancel_own_appointment: { Args: { p_appointment_id: string; p_reason?: string | null }; Returns: void };
      reschedule_own_appointment: { Args: { p_appointment_id: string; p_starts_at: string }; Returns: void };
      save_anamnesis: { Args: { p_sections: Json; p_completion_percent: number; p_submit: boolean; p_consents: Json }; Returns: string };
    };
    Enums: { app_role: "client" | "admin"; appointment_status: "pending" | "confirmed" | "completed" | "cancelled_by_client" | "cancelled_by_admin" | "no_show" | "to_reschedule" };
    CompositeTypes: Record<string, never>;
  };
};
