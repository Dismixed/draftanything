-- Getting Warmer daily puzzle + leaderboard

create table public.getting_warmer_puzzles (
  id uuid primary key default extensions.gen_random_uuid(),
  answer text not null,
  clues jsonb not null default '[]'::jsonb,
  status text not null default 'approved'
    check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now()
);

create table public.daily_getting_warmer_puzzles (
  id uuid primary key default extensions.gen_random_uuid(),
  puzzle_id uuid not null references public.getting_warmer_puzzles(id) on delete cascade,
  publish_date date not null unique,
  created_at timestamptz not null default now()
);

create table public.getting_warmer_leaderboard (
  id uuid primary key default extensions.gen_random_uuid(),
  guest_id uuid references public.guest_sessions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  score integer not null,
  play_date date not null,
  created_at timestamptz not null default now(),
  is_legacy boolean not null default false,
  constraint getting_warmer_leaderboard_name_len
    check (char_length(btrim(display_name)) between 1 and 20),
  constraint getting_warmer_leaderboard_score_range
    check (score >= 0 and score <= 100),
  constraint getting_warmer_leaderboard_identity_check
    check (is_legacy or num_nonnulls(guest_id, user_id) >= 1)
);

create unique index getting_warmer_leaderboard_guest_play_date_idx
  on public.getting_warmer_leaderboard (guest_id, play_date) where guest_id is not null;

create unique index getting_warmer_leaderboard_user_play_date_idx
  on public.getting_warmer_leaderboard (user_id, play_date) where user_id is not null;

create index getting_warmer_leaderboard_play_date_score_idx
  on public.getting_warmer_leaderboard (play_date, score desc, created_at asc);

alter table public.getting_warmer_puzzles enable row level security;
alter table public.daily_getting_warmer_puzzles enable row level security;
alter table public.getting_warmer_leaderboard enable row level security;

revoke all on table public.getting_warmer_puzzles from anon, authenticated;
revoke all on table public.daily_getting_warmer_puzzles from anon, authenticated;
revoke all on table public.getting_warmer_leaderboard from anon, authenticated;

grant select (id, answer, clues, status, created_at)
  on public.getting_warmer_puzzles to anon, authenticated;

grant select (id, puzzle_id, publish_date, created_at)
  on public.daily_getting_warmer_puzzles to anon, authenticated;

grant select (id, display_name, score, play_date, created_at, guest_id, user_id)
  on public.getting_warmer_leaderboard to anon, authenticated;

create policy "Browser roles can read getting warmer leaderboard"
  on public.getting_warmer_leaderboard for select to anon, authenticated using (true);

-- Seed launch puzzles
insert into public.getting_warmer_puzzles (answer, clues, status) values
  ('WATERMELON', '["Refreshing","Heavy","Seeds","Striped","Summer fruit"]'::jsonb, 'approved'),
  ('FLASHLIGHT', '["Reliable","Portable","Beam","Batteries","Power outage"]'::jsonb, 'approved'),
  ('UMBRELLA', '["Shelter","Folds","Handle","Puddles","Rain"]'::jsonb, 'approved'),
  ('TELESCOPE', '["Curiosity","Magnify","Lens","Night sky","Stars"]'::jsonb, 'approved'),
  ('PINEAPPLE', '["Exotic","Spiky","Crown","Tropical","Fruit"]'::jsonb, 'approved');

insert into public.daily_getting_warmer_puzzles (puzzle_id, publish_date)
select id, current_date
from public.getting_warmer_puzzles
order by created_at asc
limit 1
on conflict (publish_date) do nothing;
