create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create type public.draft_phase as enum (
  'LOBBY',
  'POOL_REVIEW',
  'DRAFTING',
  'DEFENSE',
  'VOTING',
  'JUDGING',
  'COMPLETE'
);

create type public.draft_type as enum ('standard', 'snake', 'random');
create type public.judging_mode as enum ('ai', 'community', 'hybrid');
create type public.ai_personality as enum ('analyst', 'hype', 'roast');
create type public.suggestion_action as enum ('add', 'remove');
create type public.suggestion_status as enum ('pending', 'accepted', 'rejected');
create type public.item_source as enum ('ai', 'manual');
create type public.judgment_source as enum ('ai', 'fallback');

create table public.guest_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint guest_sessions_token_hash_nonempty
    check (char_length(btrim(token_hash)) between 1 and 255),
  constraint guest_sessions_expiry_after_creation
    check (expires_at > created_at)
);

create table public.drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  room_code extensions.citext not null unique,
  topic text not null,
  phase public.draft_phase not null default 'LOBBY',
  host_guest_id uuid not null references public.guest_sessions(id),
  max_players smallint not null,
  rounds smallint not null,
  draft_type public.draft_type not null,
  judging_mode public.judging_mode not null,
  ai_personality public.ai_personality not null,
  timer_seconds smallint,
  pick_order jsonb not null default '[]'::jsonb,
  current_pick_index integer not null default 0,
  turn_deadline timestamptz,
  rubric jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint drafts_room_code_format
    check (room_code::text ~ '^[A-Z0-9]{4,12}$'),
  constraint drafts_topic_nonempty
    check (char_length(btrim(topic)) between 1 and 200),
  constraint drafts_max_players_range
    check (max_players between 2 and 6),
  constraint drafts_rounds_range
    check (rounds between 1 and 10),
  constraint drafts_timer_seconds_range
    check (timer_seconds is null or timer_seconds between 15 and 180),
  constraint drafts_pick_order_array
    check (jsonb_typeof(pick_order) = 'array'),
  constraint drafts_current_pick_index_nonnegative
    check (current_pick_index >= 0),
  constraint drafts_rubric_object
    check (jsonb_typeof(rubric) = 'object'),
  constraint drafts_completed_after_creation
    check (completed_at is null or completed_at >= created_at)
);

create table public.draft_players (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  guest_id uuid not null references public.guest_sessions(id),
  display_name text not null,
  seat smallint not null,
  is_ready boolean not null default false,
  removed_at timestamptz,
  joined_at timestamptz not null default now(),
  constraint draft_players_display_name_nonempty
    check (char_length(btrim(display_name)) between 1 and 40),
  constraint draft_players_seat_range
    check (seat between 1 and 6),
  constraint draft_players_removed_after_joined
    check (removed_at is null or removed_at >= joined_at)
);

create unique index draft_players_active_guest_key
  on public.draft_players (draft_id, guest_id)
  where removed_at is null;

create unique index draft_players_active_seat_key
  on public.draft_players (draft_id, seat)
  where removed_at is null;

create table public.draft_items (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  name text not null,
  normalized_name extensions.citext not null,
  source public.item_source not null,
  hidden_metadata jsonb not null default '{}'::jsonb,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  constraint draft_items_name_nonempty
    check (char_length(btrim(name)) between 1 and 200),
  constraint draft_items_normalized_name_nonempty
    check (char_length(btrim(normalized_name::text)) between 1 and 200),
  constraint draft_items_hidden_metadata_object
    check (jsonb_typeof(hidden_metadata) = 'object'),
  constraint draft_items_draft_id_normalized_name_key
    unique (draft_id, normalized_name)
);

create table public.picks (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  player_id uuid not null references public.draft_players(id),
  item_id uuid not null references public.draft_items(id),
  overall_pick integer not null,
  round smallint not null,
  pick_in_round smallint not null,
  is_auto_pick boolean not null default false,
  created_at timestamptz not null default now(),
  constraint picks_overall_pick_positive check (overall_pick > 0),
  constraint picks_round_positive check (round > 0),
  constraint picks_pick_in_round_positive check (pick_in_round > 0),
  constraint picks_draft_id_overall_pick_key unique (draft_id, overall_pick),
  constraint picks_draft_id_item_id_key unique (draft_id, item_id)
);

create table public.pool_suggestions (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  player_id uuid not null references public.draft_players(id),
  action public.suggestion_action not null,
  target_item_id uuid references public.draft_items(id),
  suggested_name text,
  status public.suggestion_status not null default 'pending',
  decided_at timestamptz,
  constraint pool_suggestions_action_payload check (
    (
      action = 'add'
      and target_item_id is null
      and suggested_name is not null
      and char_length(btrim(suggested_name)) between 1 and 200
    )
    or (
      action = 'remove'
      and target_item_id is not null
      and suggested_name is null
    )
  ),
  constraint pool_suggestions_decision_state check (
    (status = 'pending' and decided_at is null)
    or (status in ('accepted', 'rejected') and decided_at is not null)
  )
);

create table public.commentary (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  pick_id uuid references public.picks(id) on delete set null,
  personality public.ai_personality not null,
  text text not null,
  trigger_tags text[] not null default '{}',
  model text not null,
  prompt_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint commentary_text_nonempty
    check (char_length(btrim(text)) between 1 and 2000),
  constraint commentary_model_nonempty
    check (char_length(btrim(model)) between 1 and 120),
  constraint commentary_prompt_version_nonempty
    check (char_length(btrim(prompt_version)) between 1 and 120),
  constraint commentary_idempotency_key_nonempty
    check (char_length(btrim(idempotency_key)) between 1 and 255)
);

create table public.arguments (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  player_id uuid not null references public.draft_players(id),
  defense_text text,
  skipped boolean not null default false,
  submitted_at timestamptz not null default now(),
  constraint arguments_draft_id_player_id_key unique (draft_id, player_id),
  constraint arguments_skip_or_defense check (
    (skipped and defense_text is null)
    or (
      not skipped
      and defense_text is not null
      and char_length(btrim(defense_text)) between 1 and 2000
    )
  )
);

create table public.votes (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  voter_player_id uuid not null references public.draft_players(id),
  selected_player_id uuid not null references public.draft_players(id),
  created_at timestamptz not null default now(),
  constraint votes_draft_id_voter_player_id_key
    unique (draft_id, voter_player_id),
  constraint votes_not_self
    check (voter_player_id <> selected_player_id)
);

create table public.judgments (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  source public.judgment_source not null,
  player_scores jsonb not null,
  ranking jsonb not null,
  winner_player_ids jsonb not null,
  awards jsonb not null default '{}'::jsonb,
  explanation text not null,
  model text,
  prompt_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  constraint judgments_player_scores_object
    check (jsonb_typeof(player_scores) = 'object'),
  constraint judgments_ranking_array
    check (jsonb_typeof(ranking) = 'array'),
  constraint judgments_winner_player_ids_array
    check (jsonb_typeof(winner_player_ids) = 'array'),
  constraint judgments_awards_object
    check (jsonb_typeof(awards) = 'object'),
  constraint judgments_explanation_nonempty
    check (char_length(btrim(explanation)) between 1 and 4000),
  constraint judgments_model_for_ai check (
    (
      source = 'ai'
      and model is not null
      and char_length(btrim(model)) between 1 and 120
    )
    or (source = 'fallback' and model is null)
  ),
  constraint judgments_prompt_version_nonempty
    check (char_length(btrim(prompt_version)) between 1 and 120),
  constraint judgments_idempotency_key_nonempty
    check (char_length(btrim(idempotency_key)) between 1 and 255)
);

create index drafts_phase_idx on public.drafts (phase, created_at);
create index draft_players_draft_id_idx
  on public.draft_players (draft_id, removed_at, seat);
create index draft_items_draft_available_idx
  on public.draft_items (draft_id, is_available, normalized_name);
create index picks_draft_order_idx
  on public.picks (draft_id, overall_pick);
create index pool_suggestions_draft_status_idx
  on public.pool_suggestions (draft_id, status);
create index commentary_draft_created_idx
  on public.commentary (draft_id, created_at desc);
create index arguments_draft_id_idx on public.arguments (draft_id);
create index votes_draft_id_idx on public.votes (draft_id);
create index judgments_draft_created_idx
  on public.judgments (draft_id, created_at desc);
