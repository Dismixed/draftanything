-- AnyGuessr Puzzle System
-- Answer-agnostic puzzle store: ag_puzzles holds (answer_type, answer, clues[]),
--   so future variants ("Guess the city", "Guess the landmark"…) reuse the same
--   engine without schema changes.
--
-- Tables:
--   ag_puzzles           — generated puzzles (one row per country/answer)
--   daily_ag_puzzles     — daily schedule (one puzzle per date globally)
--   ag_puzzle_attempts   — per-user / per-guest completion tracking

/* ------------------------------------------------------------------ */
/*  ag_puzzles                                                          */
/* ------------------------------------------------------------------ */
create table public.ag_puzzles (
  id           uuid primary key default gen_random_uuid(),
  answer_type  text not null default 'country',                 -- 'country' | 'city' | 'state' | 'landmark' | 'culture' | 'language'
  answer       text not null,                                    -- canonical display string e.g. 'Japan'
  answer_id    text,                                             -- stable external id (REST Countries cca3, ISO code, …)
  alt_answers  jsonb not null default '[]'::jsonb,              -- alternate accepted spellings
  region       text,                                             -- e.g. 'Asia' (used for anyguessr-specific metadata only)
  flag_url     text,                                             -- REST Countries flag emoji URL or PNG url
  clues        jsonb not null,                                   -- Clue[] — { type, content, metadata, difficulty_rank }
  difficulty   text not null default 'medium',
  metadata     jsonb not null default '{}'::jsonb,
  status       text not null default 'approved',
  score        int  not null default 0,
  notes        text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint ag_puzzles_clues_array        check (jsonb_typeof(clues) = 'array'),
  constraint ag_puzzles_alt_answers_array  check (jsonb_typeof(alt_answers) = 'array'),
  constraint ag_puzzles_status_check        check (status in ('draft','approved','scheduled','published','rejected')),
  constraint ag_puzzles_answer_type_check    check (answer_type in ('country','city','state','landmark','culture','language'))
);

create unique index ag_puzzles_answer_unique
  on public.ag_puzzles (answer_type, answer);
create index ag_puzzles_status_idx     on public.ag_puzzles (status);
create index ag_puzzles_answer_id_idx   on public.ag_puzzles (answer_id) where answer_id is not null;

/* ------------------------------------------------------------------ */
/*  daily_ag_puzzles — schedules daily                                  */
/* ------------------------------------------------------------------ */
create table public.daily_ag_puzzles (
  id          uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  puzzle_id   uuid not null references public.ag_puzzles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index daily_ag_puzzles_date_idx on public.daily_ag_puzzles (publish_date desc);

/* ------------------------------------------------------------------ */
/*  ag_puzzle_attempts — per-user / per-guest completion tracking       */
/* ------------------------------------------------------------------ */
create table public.ag_puzzle_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  guest_id        uuid references public.guest_sessions(id) on delete set null,
  puzzle_id       uuid not null references public.ag_puzzles(id) on delete cascade,
  mode            text not null,
  completed       boolean not null default false,
  surrendered     boolean not null default false,
  correct         boolean not null default false,
  score           int not null default 0,
  guesses         int not null default 0,
  clues_revealed  int not null default 0,
  created_at      timestamptz not null default now(),
  constraint ag_puzzle_attempts_identity_check check (num_nonnulls(guest_id, user_id) >= 1),
  constraint ag_puzzle_attempts_mode_check     check (mode in ('daily','infinite'))
);

create index ag_puzzle_attempts_user_idx  on public.ag_puzzle_attempts (user_id, mode);
create index ag_puzzle_attempts_guest_idx on public.ag_puzzle_attempts (guest_id, mode);
create index ag_puzzle_attempts_puzzle_idx on public.ag_puzzle_attempts (puzzle_id);