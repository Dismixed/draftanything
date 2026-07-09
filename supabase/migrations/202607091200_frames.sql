-- Frames daily puzzle + leaderboard

create table public.frames_puzzles (
  id uuid primary key default extensions.gen_random_uuid(),
  movie jsonb not null,
  song jsonb not null,
  show jsonb not null,
  album jsonb not null,
  status text not null default 'approved'
    check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz not null default now()
);

create table public.daily_frames_puzzles (
  id uuid primary key default extensions.gen_random_uuid(),
  puzzle_id uuid not null references public.frames_puzzles(id) on delete cascade,
  publish_date date not null unique,
  created_at timestamptz not null default now()
);

create table public.frames_leaderboard (
  id uuid primary key default extensions.gen_random_uuid(),
  guest_id uuid references public.guest_sessions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  score integer not null,
  play_date date not null,
  created_at timestamptz not null default now(),
  is_legacy boolean not null default false,
  constraint frames_leaderboard_name_len
    check (char_length(btrim(display_name)) between 1 and 20),
  constraint frames_leaderboard_score_range
    check (score >= 0 and score <= 4000),
  constraint frames_leaderboard_identity_check
    check (is_legacy or num_nonnulls(guest_id, user_id) >= 1)
);

create unique index frames_leaderboard_guest_play_date_idx
  on public.frames_leaderboard (guest_id, play_date) where guest_id is not null;

create unique index frames_leaderboard_user_play_date_idx
  on public.frames_leaderboard (user_id, play_date) where user_id is not null;

create index frames_leaderboard_play_date_score_idx
  on public.frames_leaderboard (play_date, score desc, created_at asc);

alter table public.frames_puzzles enable row level security;
alter table public.daily_frames_puzzles enable row level security;
alter table public.frames_leaderboard enable row level security;

revoke all on table public.frames_puzzles from anon, authenticated;
revoke all on table public.daily_frames_puzzles from anon, authenticated;
revoke all on table public.frames_leaderboard from anon, authenticated;

grant select (id, movie, song, show, album, status, created_at)
  on public.frames_puzzles to anon, authenticated;

grant select (id, puzzle_id, publish_date, created_at)
  on public.daily_frames_puzzles to anon, authenticated;

grant select (id, display_name, score, play_date, created_at, guest_id, user_id)
  on public.frames_leaderboard to anon, authenticated;

create policy "Browser roles can read frames leaderboard"
  on public.frames_leaderboard for select to anon, authenticated using (true);

-- Seed launch puzzle (Good Will Hunting / Maple Leaf Rag / Severance / Pink Floyd)
insert into public.frames_puzzles (movie, song, show, album)
values (
  '{"answer":"Good Will Hunting","img":"/frames/movie.avif","hint":"Drama · 1997"}'::jsonb,
  '{"answer":"Maple Leaf Rag","audio":"https://archive.org/download/ScottJoplinsMapleLeafRag/MapleLeafRag.mp3","artist":"Scott Joplin","hint":"Scott Joplin"}'::jsonb,
  '{"answer":"Severance","img":"/frames/show.jpg","hint":"Thriller · Apple TV+"}'::jsonb,
  '{"answer":"Pink Floyd","img":"/frames/album.png","hint":"Progressive Rock","albumName":"The Dark Side of the Moon"}'::jsonb
);

insert into public.daily_frames_puzzles (puzzle_id, publish_date)
select id, current_date
from public.frames_puzzles
order by created_at asc
limit 1
on conflict (publish_date) do nothing;
