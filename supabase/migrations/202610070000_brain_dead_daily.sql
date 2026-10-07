-- Brain Dead daily question sets: one stored row per date, so the daily
-- survives cache evictions and deploys and can be built ahead by the cron.

create table public.brain_dead_daily (
  play_date  date primary key,
  questions  jsonb not null,
  created_at timestamptz not null default now(),
  constraint brain_dead_daily_questions_array check (jsonb_typeof(questions) = 'array')
);

alter table public.brain_dead_daily enable row level security;

-- Questions include the correct answer index; only the server reads them.
revoke all on table public.brain_dead_daily from anon, authenticated;
