-- One row per player per competitive daily per day, written when the game ends.
-- The finish screen's "better than X% of players" is computed from these rows.
-- The leaderboards only hold players who chose to enter a name, so they cannot be used for this.

create table public.daily_finishes (
  id         uuid primary key default extensions.gen_random_uuid(),
  game       text not null,
  play_date  date not null,
  -- The game's own score. For Getting Warmer it is the number of guesses.
  score      integer not null,
  user_id    uuid references public.profiles(id) on delete cascade,
  guest_id   uuid references public.guest_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint daily_finishes_game
    check (game in ('brain-dead', 'anyguessr', 'freezeframes', 'ball-knowledge', 'getting-warmer')),
  constraint daily_finishes_score_range
    check (score >= 0 and score <= 100000),
  constraint daily_finishes_one_player
    check (num_nonnulls(user_id, guest_id) = 1)
);

create unique index daily_finishes_user_uidx
  on public.daily_finishes (game, play_date, user_id) where user_id is not null;

create unique index daily_finishes_guest_uidx
  on public.daily_finishes (game, play_date, guest_id) where guest_id is not null;

create index daily_finishes_day_score_idx
  on public.daily_finishes (game, play_date, score);

alter table public.daily_finishes enable row level security;

-- Only the server reads and writes this table, through the service role.
revoke all on table public.daily_finishes from anon, authenticated;
