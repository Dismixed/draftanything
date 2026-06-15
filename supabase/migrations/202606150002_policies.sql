alter table public.guest_sessions enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_players enable row level security;
alter table public.draft_items enable row level security;
alter table public.picks enable row level security;
alter table public.pool_suggestions enable row level security;
alter table public.commentary enable row level security;
alter table public.arguments enable row level security;
alter table public.votes enable row level security;
alter table public.judgments enable row level security;

revoke all on table
  public.guest_sessions,
  public.drafts,
  public.draft_players,
  public.draft_items,
  public.picks,
  public.pool_suggestions,
  public.commentary,
  public.arguments,
  public.votes,
  public.judgments
from anon, authenticated;

grant select (
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, timer_seconds, pick_order, current_pick_index, turn_deadline,
  created_at, completed_at
) on public.drafts to anon, authenticated;

grant select (
  id, draft_id, display_name, seat, is_ready, removed_at, joined_at
) on public.draft_players to anon, authenticated;

grant select (
  id, draft_id, name, source, is_available, created_at
) on public.draft_items to anon, authenticated;

grant select (
  id, draft_id, player_id, item_id, overall_pick, round, pick_in_round,
  is_auto_pick, created_at
) on public.picks to anon, authenticated;

grant select (
  id, draft_id, player_id, action, target_item_id, suggested_name, status,
  decided_at
) on public.pool_suggestions to anon, authenticated;

grant select (
  id, draft_id, pick_id, personality, text, trigger_tags, model,
  prompt_version, created_at
) on public.commentary to anon, authenticated;

grant select (
  id, draft_id, player_id, defense_text, skipped, submitted_at
) on public.arguments to anon, authenticated;

grant select (
  id, draft_id, voter_player_id, selected_player_id, created_at
) on public.votes to anon, authenticated;

grant select (
  id, draft_id, source, player_scores, ranking, winner_player_ids, awards,
  explanation, model, prompt_version, created_at
) on public.judgments to anon, authenticated;

create policy "Browser roles can read drafts"
  on public.drafts for select to anon, authenticated using (true);
create policy "Browser roles can read draft players"
  on public.draft_players for select to anon, authenticated using (true);
create policy "Browser roles can read draft items"
  on public.draft_items for select to anon, authenticated using (true);
create policy "Browser roles can read picks"
  on public.picks for select to anon, authenticated using (true);
create policy "Browser roles can read pool suggestions"
  on public.pool_suggestions for select to anon, authenticated using (true);
create policy "Browser roles can read commentary"
  on public.commentary for select to anon, authenticated using (true);
create policy "Browser roles can read arguments"
  on public.arguments for select to anon, authenticated using (true);
create policy "Browser roles can read votes"
  on public.votes for select to anon, authenticated using (true);
create policy "Browser roles can read judgments"
  on public.judgments for select to anon, authenticated using (true);

create view public.safe_drafts
with (security_invoker = true) as
select
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, timer_seconds, pick_order, current_pick_index, turn_deadline,
  created_at, completed_at
from public.drafts;

create view public.safe_draft_players
with (security_invoker = true) as
select id, draft_id, display_name, seat, is_ready, removed_at, joined_at
from public.draft_players;

create view public.safe_draft_items
with (security_invoker = true) as
select id, draft_id, name, source, is_available, created_at
from public.draft_items;

create view public.safe_picks
with (security_invoker = true) as
select
  id, draft_id, player_id, item_id, overall_pick, round, pick_in_round,
  is_auto_pick, created_at
from public.picks;

create view public.safe_pool_suggestions
with (security_invoker = true) as
select
  id, draft_id, player_id, action, target_item_id, suggested_name, status,
  decided_at
from public.pool_suggestions;

create view public.safe_commentary
with (security_invoker = true) as
select
  id, draft_id, pick_id, personality, text, trigger_tags, model,
  prompt_version, created_at
from public.commentary;

create view public.safe_arguments
with (security_invoker = true) as
select id, draft_id, player_id, defense_text, skipped, submitted_at
from public.arguments;

create view public.safe_votes
with (security_invoker = true) as
select id, draft_id, voter_player_id, selected_player_id, created_at
from public.votes;

create view public.safe_judgments
with (security_invoker = true) as
select
  id, draft_id, source, player_scores, ranking, winner_player_ids, awards,
  explanation, model, prompt_version, created_at
from public.judgments;

revoke all on table
  public.safe_drafts,
  public.safe_draft_players,
  public.safe_draft_items,
  public.safe_picks,
  public.safe_pool_suggestions,
  public.safe_commentary,
  public.safe_arguments,
  public.safe_votes,
  public.safe_judgments
from public;

grant select on table
  public.safe_drafts,
  public.safe_draft_players,
  public.safe_draft_items,
  public.safe_picks,
  public.safe_pool_suggestions,
  public.safe_commentary,
  public.safe_arguments,
  public.safe_votes,
  public.safe_judgments
to anon, authenticated;
