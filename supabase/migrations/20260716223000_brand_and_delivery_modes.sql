begin;

update public.locations
set name = 'Palestra del cliente',
    slug = 'client-gym',
    address = null,
    city = null,
    description = 'Allenamento nella palestra utilizzata dal cliente, previo accordo con la struttura.',
    directions = null,
    parking = null,
    accessibility = null,
    latitude = null,
    longitude = null,
    mode = 'in_person'
where slug = 'studio-forma';

insert into public.locations (name, slug, mode, description, is_active)
values
  ('Online', 'online', 'online', 'Coaching, programmazione e check in videochiamata.', true),
  ('A domicilio', 'home', 'home', 'Sessione presso il domicilio del cliente, con organizzazione concordata.', true)
on conflict (slug) do update
set name = excluded.name,
    mode = excluded.mode,
    description = excluded.description,
    address = null,
    city = null,
    directions = null,
    parking = null,
    accessibility = null,
    latitude = null,
    longitude = null,
    is_active = true;

insert into public.service_locations (service_id, location_id)
select s.id, l.id
from public.services s
cross join public.locations l
where s.is_active and l.slug in ('client-gym', 'online', 'home')
on conflict do nothing;

insert into public.availability_rules (location_id, iso_weekday, start_time, end_time)
select l.id, weekday, '08:00', '20:00'
from public.locations l
cross join generate_series(1, 5) weekday
where l.slug in ('client-gym', 'online', 'home')
  and not exists (
    select 1
    from public.availability_rules rule
    where rule.location_id = l.id
      and rule.iso_weekday = weekday
      and rule.service_id is null
  );

insert into public.site_content (content_key, locale, value, is_published, published_at)
values (
  'home.hero',
  'it',
  '{"eyebrow":"Personal Trainer · Online e in presenza","title":"Prenditi cura di te,","highlight":"un allenamento alla volta.","body":"Allenamento personalizzato, metodo e supporto costante per costruire risultati concreti e sostenibili.","primary":"Prenota una consulenza","secondary":"Scopri i servizi"}'::jsonb,
  true,
  now()
)
on conflict (content_key) do update
set value = excluded.value,
    is_published = true,
    published_at = now(),
    updated_at = now();

commit;
