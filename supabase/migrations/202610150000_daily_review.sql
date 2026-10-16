-- Admin review of upcoming dailies. A slot counts as reviewed only while the
-- scheduled content still equals content_id, so a schedule edited elsewhere
-- shows as unreviewed again.
create table public.daily_reviews (
  id           uuid primary key default extensions.gen_random_uuid(),
  game         text not null,
  publish_date date not null,
  content_id   text not null,
  reviewed_by  text not null,
  reviewed_at  timestamptz not null default now(),
  constraint daily_reviews_game
    check (game in ('hot-takes', 'ball-knowledge', 'getting-warmer', 'freezeframes', 'chainlink')),
  constraint daily_reviews_slot unique (game, publish_date)
);

-- Ball Knowledge categories are hardcoded, so retirement is a list of names.
create table public.ball_knowledge_retired_categories (
  category   text primary key,
  retired_at timestamptz not null default now()
);

-- One row per review email sent; the cron reads the latest to pace sends.
create table public.daily_review_emails (
  id               uuid primary key default extensions.gen_random_uuid(),
  sent_at          timestamptz not null default now(),
  unreviewed_count integer not null
);

alter table public.daily_reviews enable row level security;
alter table public.ball_knowledge_retired_categories enable row level security;
alter table public.daily_review_emails enable row level security;

-- Only the server reads and writes these tables, through the service role.
revoke all on table public.daily_reviews from anon, authenticated;
revoke all on table public.ball_knowledge_retired_categories from anon, authenticated;
revoke all on table public.daily_review_emails from anon, authenticated;
