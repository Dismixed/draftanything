-- AnyGuessr daily lineups: the rounds shown on each date, stored the first
-- time they are computed so that later changes to the clue pool cannot alter
-- a day players have already seen.

create table public.ag_daily_lineups (
  play_date  date primary key,
  puzzle     jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ag_daily_lineups enable row level security;

revoke all on table public.ag_daily_lineups from anon, authenticated;
