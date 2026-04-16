-- Upgrades an existing public.sessions table for per-user access via Supabase Auth.
-- Existing anonymous rows cannot be mapped to a user automatically, so they will
-- remain with user_id = null until you manually assign or delete them.

alter table public.sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.sessions
  alter column user_id set default auth.uid();

drop index if exists public.sessions_client_session_id_key;
drop index if exists public.sessions_session_name_key;

alter table public.sessions
  drop constraint if exists sessions_client_session_id_key;

alter table public.sessions
  drop constraint if exists sessions_session_name_key;

create unique index if not exists sessions_user_client_session_idx
  on public.sessions (user_id, client_session_id);

create unique index if not exists sessions_user_session_name_idx
  on public.sessions (user_id, session_name)
  where session_name is not null;

alter table public.sessions enable row level security;

drop policy if exists "users can view their sessions" on public.sessions;
drop policy if exists "users can insert their sessions" on public.sessions;
drop policy if exists "users can update their sessions" on public.sessions;
drop policy if exists "users can delete their sessions" on public.sessions;

create policy "users can view their sessions"
  on public.sessions
  for select
  using (auth.uid() = user_id);

create policy "users can insert their sessions"
  on public.sessions
  for insert
  with check (auth.uid() = user_id);

create policy "users can update their sessions"
  on public.sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their sessions"
  on public.sessions
  for delete
  using (auth.uid() = user_id);
