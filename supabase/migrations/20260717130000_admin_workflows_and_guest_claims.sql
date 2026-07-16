-- Seconda fase: workflow admin, clienti manuali, catalogo servizi e claim sicuro prenotazioni ospite.
-- Migrazione additiva e compatibile con i record esistenti.

alter table public.clients add column if not exists first_name text;
alter table public.clients add column if not exists last_name text;
alter table public.clients add column if not exists email citext;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists birth_date date;
alter table public.clients add column if not exists admin_notes text;
alter table public.clients add column if not exists associated_service_id uuid references public.services(id) on delete set null;

alter table public.services add column if not exists mode text not null default 'Online / domicilio / palestra del cliente';
alter table public.services add column if not exists icon_name text;
alter table public.services add column if not exists display_order integer not null default 0;
create index if not exists services_public_order_idx on public.services (is_active, display_order, name);

alter table public.inquiries add column if not exists requested_start timestamptz;
alter table public.inquiries add column if not exists service_id uuid references public.services(id) on delete set null;
alter table public.inquiries add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.inquiries add column if not exists admin_notes text;
create index if not exists inquiries_status_created_idx on public.inquiries (status, created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare assigned_role public.app_role;
begin
  assigned_role := case when exists(select 1 from public.admin_allowlist a where a.email=new.email and a.is_active) then 'admin'::public.app_role else 'client'::public.app_role end;
  insert into public.profiles(id,email,role,first_name,last_name,phone,email_verified_at)
  values(new.id,new.email,assigned_role,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'phone',''),new.email_confirmed_at);
  if assigned_role='client' then
    insert into public.clients(profile_id,invited_email,email,first_name,last_name,phone,account_status)
    values(new.id,new.email,new.email,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'phone',''),'active');
  end if;
  return new;
end $$;

alter table public.appointments add column if not exists inquiry_id uuid references public.inquiries(id) on delete set null;
create unique index if not exists appointments_inquiry_unique_idx on public.appointments (inquiry_id) where inquiry_id is not null;

create table if not exists public.booking_claims (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  email citext not null,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.booking_claims enable row level security;
drop policy if exists booking_claims_admin_read on public.booking_claims;
create policy booking_claims_admin_read on public.booking_claims for select to authenticated using (public.is_admin());

create or replace function public.create_public_booking_v2(
  p_service_id uuid, p_location_id uuid, p_starts_at timestamptz,
  p_first_name text, p_last_name text, p_email text, p_phone text, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_service public.services%rowtype; v_end timestamptz; v_id uuid; v_client uuid;
  v_inquiry uuid; v_token text;
begin
  if length(trim(p_first_name)) not between 1 and 80 or length(trim(p_last_name)) not between 1 and 80
     or p_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'invalid_contact'; end if;
  select * into strict v_service from public.services where id=p_service_id and is_active and bookable_online;
  if not exists(select 1 from public.service_locations where service_id=p_service_id and location_id=p_location_id) then raise exception 'invalid_location'; end if;
  v_end := p_starts_at + make_interval(mins => v_service.duration_minutes);
  if not exists(select 1 from public.get_available_slots(p_service_id,p_location_id,(p_starts_at at time zone 'Europe/Rome')::date) s where s.starts_at=p_starts_at) then raise exception 'slot_unavailable'; end if;
  select id into v_client from public.clients where profile_id=auth.uid() and account_status='active';

  insert into public.inquiries(first_name,last_name,email,phone,service_interest,preferred_mode,message,status,privacy_consent,contact_consent,assigned_client_id,requested_start,service_id,location_id)
  values(trim(p_first_name),trim(p_last_name),lower(trim(p_email)),nullif(trim(p_phone),''),v_service.name,
    (select name from public.locations where id=p_location_id),nullif(trim(p_notes),''),'new',true,true,v_client,p_starts_at,p_service_id,p_location_id)
  returning id into v_inquiry;

  insert into public.appointments (client_id,service_id,location_id,starts_at,ends_at,buffer_minutes,status,guest_first_name,guest_last_name,guest_email,guest_phone,client_notes,created_by,inquiry_id)
  values (v_client,p_service_id,p_location_id,p_starts_at,v_end,v_service.buffer_minutes,
    case when v_service.manual_approval then 'pending'::public.appointment_status else 'confirmed'::public.appointment_status end,
    trim(p_first_name),trim(p_last_name),lower(trim(p_email)),nullif(trim(p_phone),''),nullif(trim(p_notes),''),auth.uid(),v_inquiry)
  returning id into v_id;

  insert into public.notifications (profile_id,appointment_id,inquiry_id,recipient_email,channel,template,scheduled_for)
  select case when v_client is null then null else auth.uid() end,v_id,v_inquiry,lower(trim(p_email)),'email',x.template,x.scheduled_at
  from (values ('booking_confirmation',now()),('booking_reminder_24h',p_starts_at-interval '24 hours'),('booking_reminder_short',p_starts_at-make_interval(hours=>(select second_reminder_hours from public.booking_settings where id)))) x(template,scheduled_at);

  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.booking_claims(appointment_id,email,token_hash,expires_at)
  values(v_id,lower(trim(p_email)),digest(v_token,'sha256'),now()+interval '2 hours');
  return jsonb_build_object('appointment_id',v_id,'claim_token',v_token);
end $$;

create or replace function public.claim_guest_booking(p_token text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_claim public.booking_claims%rowtype; v_client uuid; v_email citext;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select lower(email)::citext into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if v_email is null then raise exception 'email_not_verified'; end if;
  select * into strict v_claim from public.booking_claims
    where token_hash=digest(p_token,'sha256') and claimed_at is null and expires_at>now() for update;
  if lower(v_claim.email::text) <> lower(v_email::text) then raise exception 'email_mismatch'; end if;
  select id into v_client from public.clients where profile_id=auth.uid();
  if v_client is null then
    insert into public.clients(profile_id,invited_email,email,account_status)
    values(auth.uid(),v_email,v_email,'active') returning id into v_client;
  end if;
  update public.appointments set client_id=v_client,updated_at=now() where id=v_claim.appointment_id and client_id is null;
  update public.inquiries set assigned_client_id=v_client,updated_at=now()
    where id=(select inquiry_id from public.appointments where id=v_claim.appointment_id);
  update public.booking_claims set claimed_at=now(),claimed_by=auth.uid() where id=v_claim.id;
  return v_claim.appointment_id;
end $$;

-- La versione precedente falliva se il profilo Auth non aveva ancora la relativa riga clients.
-- Questa versione crea in modo sicuro l'anagrafica proprietaria e ignora sezioni non-oggetto.
create or replace function public.save_anamnesis(p_sections jsonb, p_completion_percent integer, p_submit boolean, p_consents jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_client uuid; v_anamnesis uuid; v_section record; v_answer record; v_consent record; v_email citext;
begin
  if auth.uid() is null or jsonb_typeof(p_sections) <> 'object' then raise exception 'invalid_anamnesis'; end if;
  select id into v_client from public.clients where profile_id=auth.uid() and account_status not in ('disabled','anonymized');
  if v_client is null then
    select email into v_email from public.profiles where id=auth.uid();
    insert into public.clients(profile_id,invited_email,email,account_status)
    values(auth.uid(),v_email,v_email,'active') returning id into v_client;
  end if;
  insert into public.anamneses(client_id,version,status,completion_percent,submitted_at)
  values(v_client,1,case when p_submit then 'submitted' else 'draft' end,greatest(0,least(100,p_completion_percent)),case when p_submit then now() end)
  on conflict(client_id,version) do update set status=excluded.status,completion_percent=greatest(public.anamneses.completion_percent,excluded.completion_percent),submitted_at=coalesce(excluded.submitted_at,public.anamneses.submitted_at),updated_at=now()
  returning id into v_anamnesis;
  for v_section in select * from jsonb_each(p_sections) loop
    if jsonb_typeof(v_section.value) = 'object' then
      for v_answer in select * from jsonb_each(v_section.value) loop
        insert into public.anamnesis_answers(anamnesis_id,section,question_key,answer,is_health_data)
        values(v_anamnesis,v_section.key,v_answer.key,coalesce(v_answer.value,'null'::jsonb),v_section.key in ('health','physical'))
        on conflict(anamnesis_id,question_key) do update set section=excluded.section,answer=excluded.answer,is_health_data=excluded.is_health_data,updated_at=now();
      end loop;
    end if;
  end loop;
  if jsonb_typeof(p_consents)='array' then
    for v_consent in select * from jsonb_to_recordset(p_consents) as x(type text,version text,granted boolean) loop
      insert into public.consents(client_id,consent_type,document_version,granted,ip_address,revoked_at)
      values(v_client,v_consent.type,v_consent.version,coalesce(v_consent.granted,false),inet_client_addr(),case when coalesce(v_consent.granted,false) then null else now() end);
    end loop;
  end if;
  return v_anamnesis;
end $$;

revoke all on function public.create_public_booking_v2(uuid,uuid,timestamptz,text,text,text,text,text) from public;
revoke all on function public.claim_guest_booking(text) from public;
grant execute on function public.create_public_booking_v2(uuid,uuid,timestamptz,text,text,text,text,text) to anon,authenticated;
grant execute on function public.claim_guest_booking(text) to authenticated;
grant execute on function public.save_anamnesis(jsonb,integer,boolean,jsonb) to authenticated;
