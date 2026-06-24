-- Chainlink Puzzle System
-- Tables for phrase pairs, puzzle chains, daily scheduling, and user attempts

/* ------------------------------------------------------------------ */
/*  chain_phrases — stores valid word-pair phrases                     */
/* ------------------------------------------------------------------ */
create table public.chain_phrases (
  id uuid primary key default gen_random_uuid(),
  word_a text not null,
  word_b text not null,
  phrase text not null,
  commonness_score int not null default 5,
  category text,
  source text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chain_phrases_commonness_score_range check (commonness_score between 1 and 10)
);

create unique index chain_phrases_word_pair_unique on public.chain_phrases (lower(word_a), lower(word_b));
create unique index chain_phrases_phrase_unique on public.chain_phrases (lower(phrase));
create index chain_phrases_active_idx on public.chain_phrases (is_active) where is_active = true;
create index chain_phrases_category_idx on public.chain_phrases (category) where category is not null;

/* ------------------------------------------------------------------ */
/*  chain_puzzles — stores full puzzle chains                          */
/* ------------------------------------------------------------------ */
create table public.chain_puzzles (
  id uuid primary key default gen_random_uuid(),
  title text,
  words jsonb not null,
  phrases jsonb not null,
  difficulty text not null default 'easy',
  theme text,
  status text not null default 'draft',
  score int not null default 0,
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chain_puzzles_words_array check (jsonb_typeof(words) = 'array'),
  constraint chain_puzzles_phrases_array check (jsonb_typeof(phrases) = 'array'),
  constraint chain_puzzles_difficulty_check check (difficulty in ('easy', 'medium', 'hard')),
  constraint chain_puzzles_status_check check (status in ('draft', 'approved', 'scheduled', 'published', 'rejected'))
);

create index chain_puzzles_status_idx on public.chain_puzzles (status);
create index chain_puzzles_difficulty_idx on public.chain_puzzles (difficulty);

/* ------------------------------------------------------------------ */
/*  daily_chain_puzzles — schedules daily puzzles                      */
/* ------------------------------------------------------------------ */
create table public.daily_chain_puzzles (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  puzzle_id uuid not null references public.chain_puzzles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index daily_chain_puzzles_date_idx on public.daily_chain_puzzles (publish_date desc);

/* ------------------------------------------------------------------ */
/*  chain_puzzle_attempts — tracks user attempts (optional tracking)   */
/* ------------------------------------------------------------------ */
create table public.chain_puzzle_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  puzzle_id uuid not null references public.chain_puzzles(id) on delete cascade,
  mode text not null,
  completed boolean not null default false,
  score int not null default 0,
  created_at timestamptz not null default now(),
  constraint chain_puzzle_attempts_mode_check check (mode in ('daily', 'infinite'))
);

create index chain_puzzle_attempts_user_idx on public.chain_puzzle_attempts (user_id, mode);
create index chain_puzzle_attempts_puzzle_idx on public.chain_puzzle_attempts (puzzle_id);
