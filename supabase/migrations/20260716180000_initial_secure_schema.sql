-- Francesco Crivello PT — schema iniziale sicuro per Supabase.
-- Le date sono salvate in UTC (timestamptz) e mostrate in Europe/Rome.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists citext;

create type public.app_role as enum ('client', 'admin');
create type public.inquiry_status as enum ('new','to_contact','contacted','consultation_booked','converted','not_interested','archived');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled_by_client','cancelled_by_admin','no_show','to_reschedule');
create type public.notification_status as enum ('queued','sent','failed','read');
create type public.document_kind as enum ('medical_certificate','training_plan','assessment','consent','photo','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext,
  role public.app_role not null default 'client',
  first_name text not null default '',
  last_name text not null default '',
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
  account_status text not null default 'active' check (account_status in ('invited','active','disabled','anonymized')),
  primary_goal text,
  next_action text,
  retention_until date,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  address text, city text, description text, directions text, parking text, accessibility text,
  latitude numeric(9,6), longitude numeric(9,6),
  mode text not null default 'in_person' check (mode in ('in_person','online','home','outdoor')),
  is_active boolean not null default true, created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  short_description text not null, full_description text,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  buffer_minutes integer not null default 15 check (buffer_minutes between 0 and 120),
  price_cents integer check (price_cents >= 0), image_path text,
  is_active boolean not null default true, bookable_online boolean not null default true,
  manual_approval boolean not null default false, questionnaire_required boolean not null default true,
  max_participants integer not null default 1 check (max_participants between 1 and 20),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.service_locations (
  service_id uuid references public.services(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  primary key (service_id, location_id)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(), location_id uuid not null references public.locations(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  start_time time not null, end_time time not null, valid_from date, valid_until date,
  is_active boolean not null default true, check (start_time < end_time),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(), location_id uuid references public.locations(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null,
  kind text not null check (kind in ('closed','extra_availability','holiday','break')),
  reason text, check (starts_at < ends_at)
);

create table public.booking_settings (
  id boolean primary key default true check (id), timezone text not null default 'Europe/Rome' check (timezone = 'Europe/Rome'),
  min_notice_hours integer not null default 12 check (min_notice_hours >= 0),
  cancellation_limit_hours integer not null default 24 check (cancellation_limit_hours >= 0),
  max_days_ahead integer not null default 90 check (max_days_ahead between 1 and 365),
  max_daily_appointments integer not null default 8 check (max_daily_appointments > 0),
  second_reminder_hours integer not null default 3 check (second_reminder_hours between 1 and 23),
  updated_at timestamptz not null default now()
);
insert into public.booking_settings (id) values (true);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(), first_name text not null, last_name text not null,
  email citext not null, phone text, service_interest text, primary_goal text, preferred_mode text,
  preferred_time text, message text, status public.inquiry_status not null default 'new',
  privacy_consent boolean not null, contact_consent boolean not null,
  assigned_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (length(first_name) between 1 and 80 and length(last_name) between 1 and 80),
  check (email::text ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  check (privacy_consent and contact_consent)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  starts_at timestamptz not null, ends_at timestamptz not null,
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  blocked_until timestamptz not null,
  status public.appointment_status not null default 'pending',
  guest_first_name text, guest_last_name text, guest_email citext, guest_phone text,
  client_notes text, admin_notes text, recurrence_group uuid, cancelled_at timestamptz,
  cancellation_reason text, created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (starts_at < ends_at), check (client_id is not null or guest_email is not null),
  exclude using gist (
    location_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending','confirmed'))
);
create or replace function public.set_appointment_blocked_until()
returns trigger language plpgsql set search_path = public as $$
begin
  new.blocked_until := new.ends_at + new.buffer_minutes * interval '1 minute';
  return new;
end $$;
create trigger appointments_blocked_until
before insert or update of ends_at,buffer_minutes on public.appointments
for each row execute function public.set_appointment_blocked_until();
create index appointments_client_date_idx on public.appointments (client_id, starts_at desc);
create index appointments_date_idx on public.appointments (starts_at, status);

create table public.anamneses (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  version integer not null default 1, status text not null default 'draft' check (status in ('draft','submitted','reviewed','archived')),
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  submitted_at timestamptz, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (client_id, version)
);

create table public.anamnesis_answers (
  id uuid primary key default gen_random_uuid(), anamnesis_id uuid not null references public.anamneses(id) on delete cascade,
  section text not null, question_key text not null, answer jsonb not null,
  is_health_data boolean not null default false, updated_at timestamptz not null default now(),
  unique (anamnesis_id, question_key)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  kind public.document_kind not null, title text not null, storage_path text not null unique,
  mime_type text not null, size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid references public.profiles(id) on delete set null, expires_at date,
  is_visible_to_client boolean not null default true, created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  consent_type text not null, document_version text not null, granted boolean not null,
  ip_address inet, granted_at timestamptz not null default now(), revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict, body text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  recipient_email citext,
  channel text not null check (channel in ('email','sms','in_app')), template text not null,
  scheduled_for timestamptz not null, sent_at timestamptz, status public.notification_status not null default 'queued',
  error text, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete set null,
  display_name text not null, quote text not null, rating smallint check (rating between 1 and 5), image_path text,
  explicit_publication_consent boolean not null default false, approved_at timestamptz,
  published boolean not null default false, created_at timestamptz not null default now(),
  check (not published or (explicit_publication_consent and approved_at is not null))
);

create table public.site_content (
  id uuid primary key default gen_random_uuid(), content_key text not null unique, locale text not null default 'it',
  value jsonb not null, is_published boolean not null default false, published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null, updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null, action text not null,
  entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb,
  ip_address inet, created_at timestamptz not null default now()
);
create index activity_logs_client_idx on public.activity_logs (client_id, created_at desc);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export','rectification','erasure')),
  status text not null default 'new' check (status in ('new','processing','completed','rejected')),
  details text, completed_at timestamptz, created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and is_active) $$;

create or replace function public.owns_client(target_client uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.clients where id = target_client and profile_id = auth.uid() and account_status = 'active') $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, email_verified_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'first_name',''), coalesce(new.raw_user_meta_data ->> 'last_name',''), new.email_confirmed_at);
  insert into public.clients (profile_id, invited_email, account_status) values (new.id, new.email, 'active');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();
create trigger inquiries_updated before update on public.inquiries for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger anamneses_updated before update on public.anamneses for each row execute function public.set_updated_at();

create or replace function public.get_available_slots(p_service_id uuid, p_location_id uuid, p_day date)
returns table(starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  with cfg as (select * from public.booking_settings where id),
  svc as (select * from public.services where id = p_service_id and is_active and bookable_online),
  windows as (
    select p_day + ar.start_time as local_start, p_day + ar.end_time as local_end
    from public.availability_rules ar, svc
    where ar.location_id = p_location_id and ar.is_active
      and (ar.service_id is null or ar.service_id = p_service_id)
      and ar.iso_weekday = extract(isodow from p_day)
      and (ar.valid_from is null or p_day >= ar.valid_from) and (ar.valid_until is null or p_day <= ar.valid_until)
  ), candidates as (
    select gs at time zone cfg.timezone as slot_start,
           (gs + make_interval(mins => svc.duration_minutes)) at time zone cfg.timezone as slot_end,
           svc.buffer_minutes, cfg.*
    from windows, svc, cfg,
    lateral generate_series(local_start, local_end - make_interval(mins => svc.duration_minutes), interval '15 minutes') gs
  )
  select c.slot_start, c.slot_end from candidates c
  where c.slot_start >= now() + make_interval(hours => c.min_notice_hours)
    and c.slot_start <= now() + make_interval(days => c.max_days_ahead)
    and (select count(*) from public.appointments a where (a.starts_at at time zone c.timezone)::date = p_day and a.status in ('pending','confirmed')) < c.max_daily_appointments
    and not exists (select 1 from public.availability_exceptions x where (x.location_id is null or x.location_id = p_location_id)
      and x.kind in ('closed','holiday','break') and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(c.slot_start,c.slot_end,'[)'))
    and not exists (select 1 from public.appointments a where a.location_id = p_location_id and a.status in ('pending','confirmed')
      and tstzrange(a.starts_at,a.ends_at + make_interval(mins => a.buffer_minutes),'[)') && tstzrange(c.slot_start,c.slot_end + make_interval(mins => c.buffer_minutes),'[)'))
  order by c.slot_start;
$$;

create or replace function public.create_public_inquiry(
  p_first_name text,p_last_name text,p_email text,p_phone text,p_service text,p_goal text,p_mode text,p_time text,p_message text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if length(trim(p_first_name)) not between 1 and 80 or length(trim(p_last_name)) not between 1 and 80
     or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid_contact'; end if;
  insert into public.inquiries(first_name,last_name,email,phone,service_interest,primary_goal,preferred_mode,preferred_time,message,status,privacy_consent,contact_consent)
  values(trim(p_first_name),trim(p_last_name),lower(trim(p_email)),nullif(trim(p_phone),''),nullif(trim(p_service),''),nullif(trim(p_goal),''),nullif(trim(p_mode),''),nullif(trim(p_time),''),nullif(trim(p_message),''),'new',true,true)
  returning id into v_id;
  insert into public.notifications(inquiry_id,recipient_email,channel,template,scheduled_for,payload) values
  (v_id,lower(trim(p_email)),'email','inquiry_confirmation',now(),jsonb_build_object('first_name',trim(p_first_name))),
  (v_id,null,'email','new_inquiry_admin',now(),jsonb_build_object('first_name',trim(p_first_name),'last_name',trim(p_last_name),'service',p_service));
  return v_id;
end $$;

create or replace function public.create_public_booking(
  p_service_id uuid, p_location_id uuid, p_starts_at timestamptz,
  p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_service public.services%rowtype; v_end timestamptz; v_id uuid; v_client uuid;
begin
  if length(trim(p_first_name)) not between 1 and 80 or length(trim(p_last_name)) not between 1 and 80
     or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid_contact'; end if;
  select * into strict v_service from public.services where id=p_service_id and is_active and bookable_online;
  if not exists(select 1 from public.service_locations where service_id=p_service_id and location_id=p_location_id) then raise exception 'invalid_location'; end if;
  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);
  if not exists(select 1 from public.get_available_slots(p_service_id,p_location_id,(p_starts_at at time zone 'Europe/Rome')::date) s where s.starts_at=p_starts_at) then raise exception 'slot_unavailable'; end if;
  select id into v_client from public.clients where profile_id=auth.uid() and account_status='active';
  insert into public.appointments (client_id,service_id,location_id,starts_at,ends_at,buffer_minutes,status,guest_first_name,guest_last_name,guest_email,guest_phone,client_notes,created_by)
  values (v_client,p_service_id,p_location_id,p_starts_at,v_end,v_service.buffer_minutes,case when v_service.manual_approval then 'pending'::public.appointment_status else 'confirmed'::public.appointment_status end,trim(p_first_name),trim(p_last_name),lower(trim(p_email)),nullif(trim(p_phone),''),nullif(trim(p_notes),''),auth.uid()) returning id into v_id;
  insert into public.notifications (profile_id,appointment_id,recipient_email,channel,template,scheduled_for)
  select case when v_client is null then null else auth.uid() end,v_id,lower(trim(p_email)),'email',x.template,x.scheduled_at
  from (values ('booking_confirmation',now()),('booking_reminder_24h',p_starts_at-interval '24 hours'),('booking_reminder_short',p_starts_at-make_interval(hours=>(select second_reminder_hours from public.booking_settings where id)))) x(template,scheduled_at);
  return v_id;
end $$;

create or replace function public.queue_appointment_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_email citext;
begin
  if old.starts_at is not distinct from new.starts_at and old.status is not distinct from new.status then return new; end if;
  select coalesce(new.guest_email,p.email) into v_email from public.clients c left join public.profiles p on p.id=c.profile_id where c.id=new.client_id;
  v_email := coalesce(v_email,new.guest_email);
  insert into public.notifications(profile_id,appointment_id,recipient_email,channel,template,scheduled_for,payload)
  values((select profile_id from public.clients where id=new.client_id),new.id,v_email,'email',case when new.status in ('cancelled_by_client','cancelled_by_admin') then 'booking_cancellation' else 'booking_change' end,now(),jsonb_build_object('starts_at',new.starts_at,'status',new.status));
  return new;
end $$;
create trigger appointment_change_notification after update of starts_at,status on public.appointments for each row execute function public.queue_appointment_change();

create or replace function public.cancel_own_appointment(p_appointment_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.appointments a set status='cancelled_by_client',cancelled_at=now(),cancellation_reason=nullif(trim(p_reason),'')
  where a.id=p_appointment_id and public.owns_client(a.client_id) and a.status in ('pending','confirmed')
    and a.starts_at > now()+make_interval(hours=>(select cancellation_limit_hours from public.booking_settings where id));
  if not found then raise exception 'cancellation_not_allowed'; end if;
end $$;

create or replace function public.reschedule_own_appointment(p_appointment_id uuid, p_starts_at timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare v_appointment public.appointments%rowtype; v_service public.services%rowtype;
begin
  select * into strict v_appointment from public.appointments a
  where a.id=p_appointment_id and public.owns_client(a.client_id) and a.status in ('pending','confirmed')
    and a.starts_at > now()+make_interval(hours=>(select cancellation_limit_hours from public.booking_settings where id));
  select * into strict v_service from public.services where id=v_appointment.service_id and is_active;
  if not exists(select 1 from public.get_available_slots(v_appointment.service_id,v_appointment.location_id,(p_starts_at at time zone 'Europe/Rome')::date) s where s.starts_at=p_starts_at)
  then raise exception 'slot_unavailable'; end if;
  update public.appointments set starts_at=p_starts_at,ends_at=p_starts_at+make_interval(mins=>v_service.duration_minutes),status=case when v_service.manual_approval then 'pending'::public.appointment_status else 'confirmed'::public.appointment_status end where id=p_appointment_id;
end $$;

create or replace function public.save_anamnesis(p_sections jsonb, p_completion_percent integer, p_submit boolean, p_consents jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_client uuid; v_anamnesis uuid; v_section record; v_answer record; v_consent record;
begin
  select id into strict v_client from public.clients where profile_id=auth.uid() and account_status='active';
  insert into public.anamneses(client_id,version,status,completion_percent,submitted_at)
  values(v_client,1,case when p_submit then 'submitted' else 'draft' end,greatest(0,least(100,p_completion_percent)),case when p_submit then now() end)
  on conflict(client_id,version) do update set status=excluded.status,completion_percent=excluded.completion_percent,submitted_at=coalesce(excluded.submitted_at,public.anamneses.submitted_at),updated_at=now()
  returning id into v_anamnesis;
  for v_section in select * from jsonb_each(p_sections) loop
    for v_answer in select * from jsonb_each(v_section.value) loop
      insert into public.anamnesis_answers(anamnesis_id,section,question_key,answer,is_health_data)
      values(v_anamnesis,v_section.key,v_answer.key,v_answer.value,v_section.key in ('health','physical'))
      on conflict(anamnesis_id,question_key) do update set section=excluded.section,answer=excluded.answer,is_health_data=excluded.is_health_data,updated_at=now();
    end loop;
  end loop;
  for v_consent in select * from jsonb_to_recordset(p_consents) as x(type text,version text,granted boolean) loop
    insert into public.consents(client_id,consent_type,document_version,granted,ip_address)
    values(v_client,v_consent.type,v_consent.version,v_consent.granted,inet_client_addr());
  end loop;
  return v_anamnesis;
end $$;

create or replace function public.convert_inquiry_to_client(p_inquiry_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_inquiry public.inquiries%rowtype; v_client uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into strict v_inquiry from public.inquiries where id=p_inquiry_id for update;
  if v_inquiry.assigned_client_id is not null then return v_inquiry.assigned_client_id; end if;
  insert into public.clients(invited_email,account_status,primary_goal,next_action)
  values(v_inquiry.email,'invited',v_inquiry.primary_goal,'Inviare invito di registrazione') returning id into v_client;
  update public.inquiries set status='converted',assigned_client_id=v_client where id=p_inquiry_id;
  return v_client;
end $$;

-- RLS: negazione predefinita, accessi espliciti per proprietario o admin.
alter table public.profiles enable row level security; alter table public.clients enable row level security;
alter table public.locations enable row level security; alter table public.services enable row level security;
alter table public.service_locations enable row level security; alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security; alter table public.booking_settings enable row level security;
alter table public.inquiries enable row level security; alter table public.appointments enable row level security;
alter table public.anamneses enable row level security; alter table public.anamnesis_answers enable row level security;
alter table public.documents enable row level security; alter table public.consents enable row level security;
alter table public.admin_notes enable row level security; alter table public.notifications enable row level security;
alter table public.reviews enable row level security; alter table public.site_content enable row level security;
alter table public.activity_logs enable row level security; alter table public.privacy_requests enable row level security;

create policy profiles_self_read on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());
create policy clients_owner_read on public.clients for select using (profile_id=auth.uid() or public.is_admin());
create policy clients_admin_manage on public.clients for all using (public.is_admin()) with check (public.is_admin());
create policy locations_public_read on public.locations for select using (is_active or public.is_admin());
create policy locations_admin_manage on public.locations for all using (public.is_admin()) with check (public.is_admin());
create policy services_public_read on public.services for select using (is_active or public.is_admin());
create policy services_admin_manage on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy service_locations_public_read on public.service_locations for select using (public.is_admin() or (exists(select 1 from public.services s where s.id=service_id and s.is_active) and exists(select 1 from public.locations l where l.id=location_id and l.is_active)));
create policy service_locations_admin_manage on public.service_locations for all using (public.is_admin()) with check (public.is_admin());
create policy availability_public_read on public.availability_rules for select using (is_active or public.is_admin());
create policy availability_admin_manage on public.availability_rules for all using (public.is_admin()) with check (public.is_admin());
create policy exceptions_admin_manage on public.availability_exceptions for all using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_manage on public.booking_settings for all using (public.is_admin()) with check (public.is_admin());
create policy inquiries_admin_manage on public.inquiries for all using (public.is_admin()) with check (public.is_admin());
create policy appointments_owner_read on public.appointments for select using (public.is_admin() or (client_id is not null and public.owns_client(client_id)));
create policy appointments_admin_manage on public.appointments for all using (public.is_admin()) with check (public.is_admin());
create policy anamneses_owner_manage on public.anamneses for all using (public.is_admin() or public.owns_client(client_id)) with check (public.is_admin() or public.owns_client(client_id));
create policy answers_owner_manage on public.anamnesis_answers for all using (public.is_admin() or exists(select 1 from public.anamneses a where a.id=anamnesis_id and public.owns_client(a.client_id))) with check (public.is_admin() or exists(select 1 from public.anamneses a where a.id=anamnesis_id and public.owns_client(a.client_id)));
create policy documents_owner_read on public.documents for select using (public.is_admin() or (public.owns_client(client_id) and is_visible_to_client));
create policy documents_owner_create on public.documents for insert with check (public.is_admin() or (public.owns_client(client_id) and uploaded_by=auth.uid()));
create policy documents_admin_manage on public.documents for all using (public.is_admin()) with check (public.is_admin());
create policy consents_owner_read on public.consents for select using (public.is_admin() or public.owns_client(client_id));
create policy consents_admin_manage on public.consents for all using (public.is_admin()) with check (public.is_admin());
create policy notes_admin_only on public.admin_notes for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_owner_read on public.notifications for select using (profile_id=auth.uid() or public.is_admin());
create policy notifications_admin_manage on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy reviews_public_read on public.reviews for select using ((published and explicit_publication_consent and approved_at is not null) or public.is_admin());
create policy reviews_admin_manage on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy content_public_read on public.site_content for select using (is_published or public.is_admin());
create policy content_admin_manage on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy logs_relevant_read on public.activity_logs for select using (public.is_admin() or (client_id is not null and public.owns_client(client_id)));
create policy logs_admin_create on public.activity_logs for insert with check (public.is_admin());
create policy privacy_owner_create on public.privacy_requests for insert with check (profile_id=auth.uid());
create policy privacy_owner_read on public.privacy_requests for select using (profile_id=auth.uid() or public.is_admin());
create policy privacy_admin_manage on public.privacy_requests for all using (public.is_admin()) with check (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.locations,public.services,public.service_locations,public.availability_rules,public.reviews,public.site_content to anon,authenticated;
grant all on all tables in schema public to authenticated,service_role;
revoke update on public.profiles from authenticated;
grant update(first_name,last_name,phone) on public.profiles to authenticated;
grant usage,select on all sequences in schema public to authenticated,service_role;

revoke all on function public.get_available_slots(uuid,uuid,date) from public;
revoke all on function public.create_public_inquiry(text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.create_public_booking(uuid,uuid,timestamptz,text,text,text,text,text) from public;
revoke all on function public.cancel_own_appointment(uuid,text) from public;
revoke all on function public.reschedule_own_appointment(uuid,timestamptz) from public;
revoke all on function public.save_anamnesis(jsonb,integer,boolean,jsonb) from public;
revoke all on function public.convert_inquiry_to_client(uuid) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.owns_client(uuid) from public;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.owns_client(uuid) to authenticated;
grant execute on function public.get_available_slots(uuid,uuid,date) to anon,authenticated;
grant execute on function public.create_public_inquiry(text,text,text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.create_public_booking(uuid,uuid,timestamptz,text,text,text,text,text) to anon,authenticated;
grant execute on function public.cancel_own_appointment(uuid,text) to authenticated;
grant execute on function public.reschedule_own_appointment(uuid,timestamptz) to authenticated;
grant execute on function public.save_anamnesis(jsonb,integer,boolean,jsonb) to authenticated;
grant execute on function public.convert_inquiry_to_client(uuid) to authenticated;

-- Storage: due bucket privati e uno pubblico solo per contenuti approvati.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('client-documents','client-documents',false,10485760,array['application/pdf','image/jpeg','image/png']),
('progress-photos','progress-photos',false,10485760,array['image/jpeg','image/png']),
('site-assets','site-assets',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy private_files_owner_read on storage.objects for select to authenticated
using (bucket_id in ('client-documents','progress-photos') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy private_files_owner_create on storage.objects for insert to authenticated
with check (bucket_id in ('client-documents','progress-photos') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy private_files_owner_update on storage.objects for update to authenticated
using (bucket_id in ('client-documents','progress-photos') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()))
with check (bucket_id in ('client-documents','progress-photos') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy private_files_owner_delete on storage.objects for delete to authenticated
using (bucket_id in ('client-documents','progress-photos') and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy site_assets_public_read on storage.objects for select using (bucket_id='site-assets');
create policy site_assets_admin_manage on storage.objects for all to authenticated using (bucket_id='site-assets' and public.is_admin()) with check (bucket_id='site-assets' and public.is_admin());
