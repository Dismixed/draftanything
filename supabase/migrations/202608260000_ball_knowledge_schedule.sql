-- Ball Knowledge daily category schedule (LRU rotation).

create table public.ball_knowledge_schedule (
  id           uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  category     text not null,
  created_at   timestamptz not null default now()
);

create index ball_knowledge_schedule_category_idx
  on public.ball_knowledge_schedule (category);

alter table public.ball_knowledge_schedule enable row level security;

revoke all on table public.ball_knowledge_schedule from anon, authenticated;
