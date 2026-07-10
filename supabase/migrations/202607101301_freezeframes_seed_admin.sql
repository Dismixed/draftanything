-- FreezeFrames seed authoring queue for media sourcing + puzzle bundling.

create table public.freezeframes_seed_entries (
  id              uuid primary key default gen_random_uuid(),
  round_key       text not null
    check (round_key in ('movie', 'song', 'show', 'album')),
  query_title     text not null,
  answer          text,
  hint            text,
  artist          text,
  album_name      text,
  img             text,
  audio           text,
  external_id     text,
  external_source text,
  status          text not null default 'draft'
    check (status in ('draft', 'needs_media', 'needs_review', 'approved', 'rejected', 'used')),
  resolve_notes   text,
  notes           text,
  puzzle_id       uuid references public.freezeframes_puzzles(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint freezeframes_seed_entries_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index freezeframes_seed_entries_round_status_idx
  on public.freezeframes_seed_entries (round_key, status);

create index freezeframes_seed_entries_puzzle_id_idx
  on public.freezeframes_seed_entries (puzzle_id)
  where puzzle_id is not null;

alter table public.freezeframes_seed_entries enable row level security;
revoke all on table public.freezeframes_seed_entries from anon, authenticated;
