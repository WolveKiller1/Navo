create table if not exists public.navo_account_continuity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  account_id text not null,
  continuity_version integer not null default 1,
  continuity_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.navo_account_continuity enable row level security;

create policy "navo continuity select own row"
on public.navo_account_continuity
for select
to authenticated
using (auth.uid() = user_id);

create policy "navo continuity insert own row"
on public.navo_account_continuity
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "navo continuity update own row"
on public.navo_account_continuity
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "navo continuity delete own row"
on public.navo_account_continuity
for delete
to authenticated
using (auth.uid() = user_id);
