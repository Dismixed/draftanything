-- Dead Reckoning: one row per player per day, written when the voyage ends.
-- The fleet (average, percentile, everyone's guesses) is read from these rows.

create table public.dead_reckoning_plays (
  id         uuid primary key default extensions.gen_random_uuid(),
  play_date  date not null,
  -- Seven entries, one per leg: a number, or null for a blank leg.
  guesses    jsonb not null,
  -- Days at sea, recomputed on the server from the guesses and the day's answers.
  -- Each crossing takes 1 to 5 days in half-day steps, so a voyage is 7 to 35.
  days       numeric(3,1) not null,
  user_id    uuid references public.profiles(id) on delete cascade,
  guest_id   uuid references public.guest_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dead_reckoning_plays_days_range
    check (days >= 7 and days <= 35),
  constraint dead_reckoning_plays_guesses_shape
    check (jsonb_typeof(guesses) = 'array' and jsonb_array_length(guesses) = 7),
  constraint dead_reckoning_plays_one_player
    check (num_nonnulls(user_id, guest_id) = 1)
);

create unique index dead_reckoning_plays_user_uidx
  on public.dead_reckoning_plays (play_date, user_id) where user_id is not null;

create unique index dead_reckoning_plays_guest_uidx
  on public.dead_reckoning_plays (play_date, guest_id) where guest_id is not null;

create index dead_reckoning_plays_day_idx
  on public.dead_reckoning_plays (play_date);

alter table public.dead_reckoning_plays enable row level security;

-- Only the server reads and writes this table, through the service role.
revoke all on table public.dead_reckoning_plays from anon, authenticated;
