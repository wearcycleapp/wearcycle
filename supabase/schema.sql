-- Wardrobe app database. Run once in Supabase: SQL Editor > New query > paste all > Run.
-- Every row belongs to the signed-in user; row-level security blocks everyone else.

-- Clothes and accessories (details kept as JSON so the app can evolve without migrations)
create table if not exists public.items (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id);

-- One row per outfit worn
create table if not exists public.wears (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date        date not null,
  occ         text not null,
  items       text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists wears_user_date_idx on public.wears (user_id, date desc);

-- Per-user settings (reminder thresholds)
create table if not exists public.settings (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  body        jsonb not null default '{}'::jsonb
);

alter table public.items    enable row level security;
alter table public.wears    enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own items" on public.items;
create policy "own items" on public.items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own wears" on public.wears;
create policy "own wears" on public.wears for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Signed-in users may use the tables (row-level security above still limits them to their own rows)
grant select, insert, update, delete on public.items, public.wears, public.settings to authenticated;
revoke all on public.items, public.wears, public.settings from anon;
-- Needed when "Automatically expose new tables" is turned off at project creation
grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Private photo bucket. Files live under "<user id>/..." and only that user can touch them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "own photos read"   on storage.objects;
drop policy if exists "own photos insert" on storage.objects;
drop policy if exists "own photos update" on storage.objects;
drop policy if exists "own photos delete" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
