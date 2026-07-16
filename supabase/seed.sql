-- Clearly fictional demo content. Do not use real client or health data.
insert into public.locations (name, slug, address, city, description, parking, accessibility)
values ('Studio Forma','studio-forma','Via Esempio 24','Palermo','Ambiente demo riservato e attrezzato.','Parcheggio nelle vicinanze.','Ingresso a piano terra.')
on conflict (slug) do nothing;

insert into public.locations (name, slug, mode, description)
values ('Online','online','online','Videochiamata protetta.') on conflict (slug) do nothing;

insert into public.services (name,slug,short_description,full_description,duration_minutes,buffer_minutes,price_cents,manual_approval,max_participants) values
('Personal training individuale','personal-training','Percorso individuale su misura.','Contenuto demo modificabile.',55,15,5500,false,1),
('Allenamento in coppia','duo-training','Allenamento condiviso con attenzione tecnica.','Contenuto demo modificabile.',60,15,7000,false,2),
('Valutazione iniziale','valutazione','Colloquio, anamnesi e test di base.','Contenuto demo modificabile.',75,15,6500,false,1),
('Coaching online','coaching-online','Programmazione e check periodici.','Contenuto demo modificabile.',45,15,11900,true,1)
on conflict (slug) do nothing;

insert into public.service_locations (service_id, location_id)
select s.id,l.id from public.services s cross join public.locations l
where (l.slug = 'studio-forma' and s.slug <> 'coaching-online') or (l.slug = 'online' and s.slug = 'coaching-online')
on conflict do nothing;

insert into public.availability_rules (location_id,iso_weekday,start_time,end_time)
select l.id,d,'08:00','20:00' from public.locations l cross join generate_series(1,5) d
where l.slug='studio-forma' and not exists (
  select 1 from public.availability_rules ar where ar.location_id=l.id and ar.iso_weekday=d and ar.service_id is null
);

insert into public.site_content (content_key,value,is_published,published_at) values
('home.hero','{"eyebrow":"Personal trainer · Palermo & online","title":"Costruisci la tua forza.","highlight":"Con metodo.","body":"Allenamento personalizzato, metodo e supporto costante per risultati concreti e sostenibili.","primary":"Prenota una consulenza","secondary":"Scopri i servizi"}',true,now()),
('contact.primary','{"phone":"+39 000 000 0000","email":"ciao@francescocrivello.it"}',true,now())
on conflict (content_key) do nothing;
