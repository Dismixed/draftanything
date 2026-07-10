-- Ball Knowledge daily leaderboard

create table public.ball_knowledge_leaderboard (
  id uuid primary key default extensions.gen_random_uuid(),
  guest_id uuid references public.guest_sessions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  score integer not null,
  play_date date not null,
  created_at timestamptz not null default now(),
  is_legacy boolean not null default false,
  constraint ball_knowledge_leaderboard_name_len
    check (char_length(btrim(display_name)) between 1 and 18),
  constraint ball_knowledge_leaderboard_score_range
    check (score >= 0 and score <= 200),
  constraint ball_knowledge_leaderboard_identity_check
    check (is_legacy or num_nonnulls(guest_id, user_id) >= 1)
);

create unique index ball_knowledge_leaderboard_guest_play_date_idx
  on public.ball_knowledge_leaderboard (guest_id, play_date) where guest_id is not null;

create unique index ball_knowledge_leaderboard_user_play_date_idx
  on public.ball_knowledge_leaderboard (user_id, play_date) where user_id is not null;

create index ball_knowledge_leaderboard_play_date_score_idx
  on public.ball_knowledge_leaderboard (play_date, score desc, created_at asc);

alter table public.ball_knowledge_leaderboard enable row level security;

revoke all on table public.ball_knowledge_leaderboard from anon, authenticated;

grant select (id, display_name, score, play_date, created_at, guest_id, user_id)
  on public.ball_knowledge_leaderboard to anon, authenticated;

create policy "Browser roles can read ball knowledge leaderboard"
  on public.ball_knowledge_leaderboard for select to anon, authenticated using (true);
