create table public.brain_dead_leaderboard (
  id uuid primary key default extensions.gen_random_uuid(),
  player_token uuid not null,
  display_name text not null,
  score integer not null,
  correct integer not null,
  play_date date not null,
  created_at timestamptz not null default now(),
  constraint brain_dead_leaderboard_name_len
    check (char_length(btrim(display_name)) between 1 and 20),
  constraint brain_dead_leaderboard_score_range
    check (score >= 0 and score <= 10000),
  constraint brain_dead_leaderboard_correct_range
    check (correct >= 0 and correct <= 15),
  unique (player_token, play_date)
);

create index brain_dead_leaderboard_play_date_score_idx
  on public.brain_dead_leaderboard (play_date, score desc, created_at asc);

alter table public.brain_dead_leaderboard enable row level security;

revoke all on table public.brain_dead_leaderboard from anon, authenticated;

grant select (
  id, display_name, score, correct, play_date, created_at
) on public.brain_dead_leaderboard to anon, authenticated;

create policy "Browser roles can read brain dead leaderboard"
  on public.brain_dead_leaderboard for select to anon, authenticated using (true);
