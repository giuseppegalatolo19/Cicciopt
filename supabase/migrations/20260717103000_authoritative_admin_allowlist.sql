-- I soli due account autorizzati come amministratori sono gestiti dal database.
-- Disattivare una voce revoca immediatamente il ruolo senza modificare il codice.
create table public.admin_allowlist (
  email citext primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_allowlist_known_emails check (
    lower(email::text) in (
      'francescopaolo.crivello96@gmail.com',
      'giuseppegalatolo24@gmail.com'
    )
  )
);

insert into public.admin_allowlist (email, is_active)
values
  ('francescopaolo.crivello96@gmail.com', true),
  ('giuseppegalatolo24@gmail.com', true)
on conflict (email) do update set is_active = excluded.is_active, updated_at = now();

create trigger admin_allowlist_updated
before update on public.admin_allowlist
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.admin_allowlist a on a.email = p.email and a.is_active
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_active
  )
$$;

create or replace function public.enforce_authorized_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' and not exists (
    select 1 from public.admin_allowlist a
    where a.email = new.email and a.is_active
  ) then
    raise exception 'email is not authorized for the admin role';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_authorized_admin on public.profiles;
create trigger profiles_authorized_admin
before insert or update of role, email on public.profiles
for each row execute function public.enforce_authorized_admin();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  assigned_role := case when exists (
    select 1 from public.admin_allowlist a
    where a.email = new.email and a.is_active
  ) then 'admin'::public.app_role else 'client'::public.app_role end;

  insert into public.profiles (id, email, role, first_name, last_name, email_verified_at)
  values (
    new.id,
    new.email,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email_confirmed_at
  );

  if assigned_role = 'client' then
    insert into public.clients (profile_id, invited_email, account_status)
    values (new.id, new.email, 'active');
  end if;
  return new;
end
$$;

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  assigned_role := case when exists (
    select 1 from public.admin_allowlist a
    where a.email = new.email and a.is_active
  ) then 'admin'::public.app_role else 'client'::public.app_role end;

  update public.profiles
  set email = new.email,
      email_verified_at = new.email_confirmed_at,
      role = assigned_role
  where id = new.id;

  if assigned_role = 'client' then
    insert into public.clients (profile_id, invited_email, account_status)
    values (new.id, new.email, 'active')
    on conflict (profile_id) do update
      set invited_email = excluded.invited_email,
          account_status = case when public.clients.account_status = 'anonymized' then public.clients.account_status else 'active' end;
  end if;
  return new;
end
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_auth_user_profile();

create or replace function public.sync_admin_allowlist_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set role = case when new.is_active then 'admin'::public.app_role else 'client'::public.app_role end
  where email = new.email;

  if not new.is_active then
    insert into public.clients (profile_id, invited_email, account_status)
    select p.id, p.email, 'active'
    from public.profiles p
    where p.email = new.email
    on conflict (profile_id) do update
      set invited_email = excluded.invited_email,
          account_status = case when public.clients.account_status = 'anonymized' then public.clients.account_status else 'active' end;
  end if;
  return new;
end
$$;

drop trigger if exists admin_allowlist_sync_profile on public.admin_allowlist;
create trigger admin_allowlist_sync_profile
after update of is_active on public.admin_allowlist
for each row execute function public.sync_admin_allowlist_profile();

-- Sincronizza gli utenti già presenti: qualunque admin non autorizzato viene revocato.
update public.profiles p
set role = case when exists (
  select 1 from public.admin_allowlist a where a.email = p.email and a.is_active
) then 'admin'::public.app_role else 'client'::public.app_role end;

insert into public.clients (profile_id, invited_email, account_status)
select p.id, p.email, 'active'
from public.profiles p
where p.role = 'client'
on conflict (profile_id) do nothing;

alter table public.admin_allowlist enable row level security;
create policy admin_allowlist_admin_read
on public.admin_allowlist for select
to authenticated
using (public.is_admin());
create policy admin_allowlist_admin_update
on public.admin_allowlist for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on public.admin_allowlist from anon, authenticated;
grant select, update(is_active) on public.admin_allowlist to authenticated;
grant all on public.admin_allowlist to service_role;

revoke all on function public.enforce_authorized_admin() from public;
revoke all on function public.sync_auth_user_profile() from public;
revoke all on function public.sync_admin_allowlist_profile() from public;
