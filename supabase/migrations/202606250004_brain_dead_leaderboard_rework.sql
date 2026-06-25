-- Rework brain_dead_leaderboard: replace player_token with dual identity columns
-- Legacy rows (player_token) cannot link to guest_sessions; grandfather via is_legacy.

alter table public.brain_dead_leaderboard
  add column guest_id uuid references public.guest_sessions(id) on delete set null;

alter table public.brain_dead_leaderboard
  add column user_id uuid references public.profiles(id) on delete set null;

alter table public.brain_dead_leaderboard
  add column is_legacy boolean not null default false;

update public.brain_dead_leaderboard
  set is_legacy = true;

alter table public.brain_dead_leaderboard
  drop constraint brain_dead_leaderboard_player_token_play_date_key;

alter table public.brain_dead_leaderboard
  drop column player_token;

alter table public.brain_dead_leaderboard
  add constraint brain_dead_leaderboard_identity_check
    check (is_legacy or num_nonnulls(guest_id, user_id) >= 1);

create unique index brain_dead_leaderboard_guest_play_date_idx
  on public.brain_dead_leaderboard (guest_id, play_date) where guest_id is not null;

create unique index brain_dead_leaderboard_user_play_date_idx
  on public.brain_dead_leaderboard (user_id, play_date) where user_id is not null;

grant select (guest_id, user_id)
  on public.brain_dead_leaderboard to anon, authenticated;
