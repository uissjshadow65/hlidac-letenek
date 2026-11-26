-- =============================================================================
-- Paříž 27 – výchozí schéma databáze
-- =============================================================================
-- Principy:
--  * Každý řádek patří jednomu uživateli (user_id) a Row Level Security
--    zajišťuje, že ho vidí a mění jen on.
--  * Záznamy se nemažou fyzicky, ale nastaví se deleted_at ("tombstone").
--    Díky tomu se smazání spolehlivě dostane i na druhé zařízení.
--  * Sloupec version zvyšuje databáze při každé změně. Aplikace posílá změnu
--    jen tehdy, když verze v databázi odpovídá verzi, kterou naposledy viděla
--    (optimistické zamykání). Jinak ohlásí konflikt a nic nepřepíše.
--  * updated_at nastavuje databáze – slouží pro stahování změn.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Společné triggerové funkce
-- -----------------------------------------------------------------------------
create or replace function public.p27_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  new.version := 1;
  new.created_at := coalesce(new.created_at, clock_timestamp());
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create or replace function public.p27_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id nelze změnit';
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.version := old.version + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Nastavení cesty (jeden řádek na uživatele, id = id uživatele)
-- -----------------------------------------------------------------------------
create table public.trip_settings (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null default 'Paříž 27' check (char_length(name) between 1 and 120),
  start_date  date,
  end_date    date,
  travelers   integer not null default 2 check (travelers between 1 and 20),
  eur_rate    numeric(10, 4) check (eur_rate is null or eur_rate > 0),
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint trip_settings_one_per_user unique (user_id),
  constraint trip_settings_id_is_user check (id = user_id),
  constraint trip_settings_dates check (start_date is null or end_date is null or end_date >= start_date)
);

-- -----------------------------------------------------------------------------
-- Položky rozpočtu
-- Částky jsou celá čísla v haléřích (CZK) nebo centech (EUR) – žádné
-- zaokrouhlovací chyby desetinných čísel.
-- -----------------------------------------------------------------------------
create table public.budget_items (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 200),
  amount_minor  bigint not null check (amount_minor >= 0 and amount_minor <= 100000000000),
  currency      text not null default 'CZK' check (currency in ('CZK', 'EUR')),
  split         boolean not null default false,
  note          text not null default '' check (char_length(note) <= 5000),
  category      text not null default 'other'
                check (category in ('transport', 'accommodation', 'food', 'activities', 'sights', 'other')),
  paid          boolean not null default false,
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index budget_items_user_updated_idx on public.budget_items (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- Poznámky a nápady
-- links = pole objektů {id, url, title, image, site, fetched_at}
-- -----------------------------------------------------------------------------
create table public.notes (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 300),
  body        text not null default '' check (char_length(body) <= 100000),
  tags        text[] not null default '{}' check (cardinality(tags) <= 30),
  links       jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  pinned      boolean not null default false,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index notes_user_updated_idx on public.notes (user_id, updated_at);

-- -----------------------------------------------------------------------------
-- Fotografie u poznámek (metadata; samotné soubory jsou v Storage)
-- -----------------------------------------------------------------------------
create table public.note_attachments (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id       uuid not null references public.notes (id) on delete cascade,
  storage_path  text not null,
  mime_type     text not null default 'image/jpeg',
  width         integer,
  height        integer,
  size_bytes    integer,
  version       integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  -- soubor musí ležet ve složce uživatele: <user_id>/<note_id>/<id>.<přípona>
  constraint note_attachments_path check (storage_path like (user_id::text || '/' || note_id::text || '/%'))
);

create index note_attachments_user_updated_idx on public.note_attachments (user_id, updated_at);
create index note_attachments_note_idx on public.note_attachments (note_id);

-- -----------------------------------------------------------------------------
-- Triggery verzí a časů
-- -----------------------------------------------------------------------------
create trigger trip_settings_bi before insert on public.trip_settings
  for each row execute function public.p27_before_insert();
create trigger trip_settings_bu before update on public.trip_settings
  for each row execute function public.p27_before_update();

create trigger budget_items_bi before insert on public.budget_items
  for each row execute function public.p27_before_insert();
create trigger budget_items_bu before update on public.budget_items
  for each row execute function public.p27_before_update();

create trigger notes_bi before insert on public.notes
  for each row execute function public.p27_before_insert();
create trigger notes_bu before update on public.notes
  for each row execute function public.p27_before_update();

create trigger note_attachments_bi before insert on public.note_attachments
  for each row execute function public.p27_before_insert();
create trigger note_attachments_bu before update on public.note_attachments
  for each row execute function public.p27_before_update();

-- Smazání poznámky označí jako smazané i všechny její fotografie.
create or replace function public.p27_cascade_note_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.note_attachments
       set deleted_at = new.deleted_at
     where note_id = new.id
       and deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger notes_cascade_delete after update of deleted_at on public.notes
  for each row execute function public.p27_cascade_note_delete();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.trip_settings    enable row level security;
alter table public.budget_items     enable row level security;
alter table public.notes            enable row level security;
alter table public.note_attachments enable row level security;

-- Nastavení cesty
create policy "trip_settings_select_own" on public.trip_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "trip_settings_insert_own" on public.trip_settings
  for insert to authenticated with check (user_id = (select auth.uid()) and id = (select auth.uid()));
create policy "trip_settings_update_own" on public.trip_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "trip_settings_delete_own" on public.trip_settings
  for delete to authenticated using (user_id = (select auth.uid()));

-- Rozpočet
create policy "budget_items_select_own" on public.budget_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "budget_items_insert_own" on public.budget_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "budget_items_update_own" on public.budget_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "budget_items_delete_own" on public.budget_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- Poznámky
create policy "notes_select_own" on public.notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notes_insert_own" on public.notes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notes_update_own" on public.notes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notes_delete_own" on public.notes
  for delete to authenticated using (user_id = (select auth.uid()));

-- Fotografie – navíc musí patřit k vlastní poznámce
create policy "note_attachments_select_own" on public.note_attachments
  for select to authenticated using (user_id = (select auth.uid()));
create policy "note_attachments_insert_own" on public.note_attachments
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
  );
create policy "note_attachments_update_own" on public.note_attachments
  for update to authenticated using (user_id = (select auth.uid())) with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
  );
create policy "note_attachments_delete_own" on public.note_attachments
  for delete to authenticated using (user_id = (select auth.uid()));

-- Anonymní (nepřihlášení) uživatelé nemají k tabulkám žádný přístup.
revoke all on public.trip_settings, public.budget_items, public.notes, public.note_attachments from anon;
grant select, insert, update, delete on public.trip_settings, public.budget_items, public.notes, public.note_attachments to authenticated;

-- -----------------------------------------------------------------------------
-- Úložiště fotografií – soukromý bucket, každý uživatel jen svou složku
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-photos', 'note-photos', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "note_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note_photos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "note_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- Realtime – okamžité upozornění druhého zařízení na změnu
-- (Realtime respektuje RLS, takže každý dostává jen své změny.)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.trip_settings, public.budget_items, public.notes, public.note_attachments;
  end if;
end;
$$;
