-- Link guest_sessions to profiles
-- Allows guest sessions to be claimed by authenticated users

alter table public.guest_sessions
  add column user_id uuid references public.profiles(id) on delete set null;

create index guest_sessions_user_id_idx
  on public.guest_sessions (user_id) where user_id is not null;
