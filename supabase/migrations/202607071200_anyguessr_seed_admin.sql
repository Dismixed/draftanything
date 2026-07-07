-- AnyGuessr seed authoring + country alias tables for admin workflow.

/* ------------------------------------------------------------------ */
/*  ag_seed_entries — per-country clue authoring queue                 */
/* ------------------------------------------------------------------ */

create table public.ag_seed_entries (
  id                      uuid primary key default gen_random_uuid(),
  cca3                    text not null,
  country_common          text not null,
  clue_type               text not null,
  wiki_title              text,
  text_content            text,
  status                  text not null default 'draft'
    check (status in ('draft', 'needs_image', 'needs_review', 'approved', 'rejected')),
  image_candidates        jsonb not null default '[]'::jsonb,
  selected_candidate_index integer not null default 0,
  vision_pass             boolean,
  vision_notes            text,
  proposed_by             text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint ag_seed_entries_image_candidates_array check (jsonb_typeof(image_candidates) = 'array'),
  constraint ag_seed_entries_unique_country_clue unique (cca3, clue_type)
);

create index ag_seed_entries_status_idx on public.ag_seed_entries (status);
create index ag_seed_entries_cca3_idx on public.ag_seed_entries (cca3);

/* ------------------------------------------------------------------ */
/*  ag_country_aliases — colloquial guess names → cca3                 */
/* ------------------------------------------------------------------ */

create table public.ag_country_aliases (
  id          uuid primary key default gen_random_uuid(),
  cca3        text not null,
  alias       text not null,
  created_at  timestamptz not null default now(),
  constraint ag_country_aliases_alias_unique unique (alias)
);

create index ag_country_aliases_cca3_idx on public.ag_country_aliases (cca3);
