-- Francesco Crivello PT — PostgreSQL/Supabase schema
-- Run in a new Supabase project before supabase/seed.sql.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists citext;

create type public.app_role as enum ('client', 'admin');
create type public.inquiry_status as enum ('new','to_contact','contacted','consultation_booked','converted','not_interested','archived');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled_client','cancelled_admin','no_show','reschedule');
create type public.notification_status as enum ('queued','sent','failed','read');
create type public.document_kind as enum ('medical_certificate','training_plan','assessment','consent','photo','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'client',
  first_name text not null,
  last_name text not null,
  phone text,
  email_verified_at timestamptz,
  timezone text not null default 'Europe/Rome' check (timezone = 'Europe/Rome'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  invited_email citext,
  account_status text not null default 'invited' check (account_status in ('invited','active','disabled','anonymized')),
  primary_goal text,
  next_action text,
  retention_until date,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  city text,
  description text,
  directions text,
  parking text,
  accessibility text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  mode text not null default 'in_person' check (mode in ('in_person','online','home','outdoor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  short_description text not null,
  full_description text,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 120),
  price_cents integer check (price_cents >= 0),
  image_path text,
  is_active boolean not null default true,
  bookable_online boolean not null default true,
  manual_approval boolean not null default false,
  questionnaire_required boolean not null default true,
  max_participants integer not null default 1 check (max_participants > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_locations (
  service_id uuid references public.services(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  primary key (service_id, location_id)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  valid_from date,
  valid_until date,
  is_active boolean not null default true,
  check (start_time < end_time)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null check (kind in ('closed','extra_availability','holiday','break')),
  reason text,
  check (starts_at < ends_at)
);

create table public.booking_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Europe/Rome' check (timezone = 'Europe/Rome'),
  min_notice_hours integer not null default 12,
  cancellation_limit_hours integer not null default 24,
  max_days_ahead integer not null default 90,
  max_daily_appointments integer not null default 8,
  second_reminder_hours integer not null default 3,
  updated_at timestamptz not null default now()
);
insert into public.booking_settings (id) values (true) on conflict do nothing;

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text,
  service_interest text,
  primary_goal text,
  preferred_mode text,
  preferred_time text,
  message text,
  status inquiry_status not null default 'new',
  privacy_consent boolean not null,
  contact_consent boolean not null,
  assigned_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  buffer_minutes integer not null default 0,
  status appointment_status not null default 'pending',
  guest_first_name text,
  guest_last_name text,
  guest_email citext,
  guest_phone text,
  client_notes text,
  admin_notes text,
  recurrence_group uuid,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (client_id is not null or guest_email is not null),
  exclude using gist (
    location_id with =,
    tstzrange(starts_at, ends_at + make_interval(mins => buffer_minutes), '[)') with &&
  ) where (status in ('pending','confirmed'))
);
create index appointments_client_date_idx on public.appointments (client_id, starts_at desc);
create index appointments_date_idx on public.appointments (starts_at, status);

create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','archived')),
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, version)
);

create table public.anamnesis_answers (
  id uuid primary key default gen_random_uuid(),
  anamnesis_id uuid not null references public.anamneses(id) on delete cascade,
  section text not null,
  question_key text not null,
  answer jsonb not null,
  is_health_data boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (anamnesis_id, question_key)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  kind document_kind not null,
  title text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid references public.profiles(id) on delete set null,
  expires_at date,
  is_visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  granted boolean not null,
  ip_address inet,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}',
  unique (client_id, consent_type, document_version, granted_at)
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel text not null check (channel in ('email','sms','in_app')),
  template text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status notification_status not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  display_name text not null,
  quote text not null,
  rating smallint check (rating between 1 and 5),
  image_path text,
  explicit_publication_consent boolean not null default false,
  approved_at timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (not published or (explicit_publication_consent and approved_at is not null))
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  locale text not null default 'it',
  value jsonb not null,
  is_published boolean not null default false,
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  ip_address inet,
  created_at timestamptz not null default now()
);
create index activity_logs_client_idx on public.activity_logs (client_id, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active) $$;

create or replace function public.owns_client(target_client uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.clients where id = target_client and profile_id = auth.uid() and account_status = 'active') $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();
create trigger inquiries_updated before update on public.inquiries for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger anamneses_updated before update on public.anamneses for each row execute function public.set_updated_at();

-- Transactional public booking. Availability, notice, closures, daily caps and
-- overlap are all checked server-side; the exclusion constraint is the final guard.
create or replace function public.create_public_booking(
  p_service_name text, p_location_name text, p_starts_at timestamptz,
  p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_service public.services%rowtype;
  v_location public.locations%rowtype;
  v_settings public.booking_settings%rowtype;
  v_end timestamptz;
  v_id uuid;
  v_local_start timestamp;
begin
  select * into strict v_service from public.services where name = p_service_name and is_active and bookable_online;
  select * into strict v_location from public.locations where name = split_part(p_location_name, ' · ', 1) and is_active;
  select * into strict v_settings from public.booking_settings where id;
  if p_starts_at < now() + make_interval(hours => v_settings.min_notice_hours) then raise exception 'minimum_notice'; end if;
  if p_starts_at > now() + make_interval(days => v_settings.max_days_ahead) then raise exception 'too_far_ahead'; end if;
  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);
  v_local_start := p_starts_at at time zone v_settings.timezone;
  if not exists (
    select 1 from public.availability_rules ar
    where ar.location_id = v_location.id and ar.is_active
      and (ar.service_id is null or ar.service_id = v_service.id)
      and ar.iso_weekday = extract(isodow from v_local_start)
      and v_local_start::time >= ar.start_time
      and (v_end at time zone v_settings.timezone)::time <= ar.end_time
      and (ar.valid_from is null or v_local_start::date >= ar.valid_from)
      and (ar.valid_until is null or v_local_start::date <= ar.valid_until)
  ) then raise exception 'outside_availability'; end if;
  if exists (
    select 1 from public.availability_exceptions ae where (ae.location_id is null or ae.location_id = v_location.id)
      and ae.kind in ('closed','holiday','break') and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)')
  ) then raise exception 'closed'; end if;
  if (select count(*) from public.appointments where (starts_at at time zone v_settings.timezone)::date = v_local_start::date and status in ('pending','confirmed')) >= v_settings.max_daily_appointments then raise exception 'daily_limit'; end if;
  insert into public.appointments (service_id, location_id, starts_at, ends_at, buffer_minutes, status, guest_first_name, guest_last_name, guest_email, guest_phone, client_notes)
  values (v_service.id, v_location.id, p_starts_at, v_end, v_service.buffer_minutes, case when v_service.manual_approval then 'pending'::appointment_status else 'confirmed'::appointment_status end, p_first_name, p_last_name, p_email, p_phone, p_notes)
  returning id into v_id;
  insert into public.notifications (appointment_id, channel, template, scheduled_for) values
    (v_id, 'email', 'booking_confirmation', now()),
    (v_id, 'email', 'booking_reminder_24h', p_starts_at - interval '24 hours'),
    (v_id, 'email', 'booking_reminder_short', p_starts_at - make_interval(hours => v_settings.second_reminder_hours));
  return v_id;
end $$;

-- RLS: default deny, then grant only explicit owner/admin paths.
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.locations enable row level security;
alter table public.services enable row level security;
alter table public.service_locations enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.booking_settings enable row level security;
alter table public.inquiries enable row level security;
alter table public.appointments enable row level security;
alter table public.anamneses enable row level security;
alter table public.anamnesis_answers enable row level security;
alter table public.documents enable row level security;
alter table public.consents enable row level security;
alter table public.admin_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;
alter table public.site_content enable row level security;
alter table public.activity_logs enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy clients_owner_select on public.clients for select using (profile_id = auth.uid() or public.is_admin());
create policy clients_admin_all on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy locations_public_read on public.locations for select using (is_active or public.is_admin());
create policy services_public_read on public.services for select using (is_active or public.is_admin());
create policy service_locations_public_read on public.service_locations for select using (true);
create policy service_locations_admin_all on public.service_locations for all using (public.is_admin()) with check (public.is_admin());
create policy availability_public_read on public.availability_rules for select using (is_active or public.is_admin());
create policy exceptions_admin_all on public.availability_exceptions for all using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_all on public.booking_settings for all using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_locations on public.locations for all using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_services on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_availability on public.availability_rules for all using (public.is_admin()) with check (public.is_admin());
create policy inquiries_admin_only on public.inquiries for all using (public.is_admin()) with check (public.is_admin());
create policy appointments_owner_select on public.appointments for select using (public.is_admin() or (client_id is not null and public.owns_client(client_id)));
create policy appointments_owner_update on public.appointments for update
using (
  client_id is not null and public.owns_client(client_id)
  and status in ('pending','confirmed')
  and starts_at > now() + make_interval(hours => (select cancellation_limit_hours from public.booking_settings where id))
)
with check (
  client_id is not null and public.owns_client(client_id)
  and status in ('pending','confirmed','cancelled_client')
);
create policy appointments_admin_update on public.appointments for update using (public.is_admin()) with check (public.is_admin());
create policy appointments_admin_insert on public.appointments for insert with check (public.is_admin());
create policy anamneses_owner_all on public.anamneses for all using (public.is_admin() or public.owns_client(client_id)) with check (public.is_admin() or public.owns_client(client_id));
create policy answers_owner_all on public.anamnesis_answers for all using (public.is_admin() or exists(select 1 from public.anamneses a where a.id = anamnesis_id and public.owns_client(a.client_id))) with check (public.is_admin() or exists(select 1 from public.anamneses a where a.id = anamnesis_id and public.owns_client(a.client_id)));
create policy documents_owner_select on public.documents for select using (public.is_admin() or (public.owns_client(client_id) and is_visible_to_client));
create policy documents_owner_insert on public.documents for insert with check (public.is_admin() or public.owns_client(client_id));
create policy documents_admin_all on public.documents for all using (public.is_admin()) with check (public.is_admin());
create policy consents_owner_all on public.consents for all using (public.is_admin() or public.owns_client(client_id)) with check (public.is_admin() or public.owns_client(client_id));
create policy notes_admin_only on public.admin_notes for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_owner_select on public.notifications for select using (profile_id = auth.uid() or public.is_admin());
create policy notifications_admin_all on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy reviews_public_select on public.reviews for select using ((published and explicit_publication_consent) or public.is_admin());
create policy reviews_admin_all on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy content_public_select on public.site_content for select using (is_published or public.is_admin());
create policy content_admin_all on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy logs_owner_select on public.activity_logs for select using (public.is_admin() or (client_id is not null and public.owns_client(client_id)));
create policy logs_admin_insert on public.activity_logs for insert with check (public.is_admin());

revoke all on function public.create_public_booking(text,text,timestamptz,text,text,text,text,text) from public;
grant execute on function public.create_public_booking(text,text,timestamptz,text,text,text,text,text) to service_role;

-- Clients can only update cancellation state and their own notes. Rescheduling is
-- performed by a server transaction that creates the new slot after validation.
revoke update on public.appointments from authenticated;
grant update (status, client_notes) on public.appointments to authenticated;
