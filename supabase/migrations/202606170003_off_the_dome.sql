-- Off the Dome: add picking_mode to drafts and freeform pick support to picks

-- 1. Create picking_mode enum and add column to drafts
create type public.picking_mode as enum ('pool', 'off_the_dome');

alter table public.drafts
  add column picking_mode public.picking_mode not null default 'pool';

-- 2. Make picks.item_id nullable (off-the-dome picks have no pool item)
alter table public.picks
  alter column item_id drop not null;

-- Replace the unique constraint on (draft_id, item_id) with a partial unique index
-- so multiple NULL item_ids are allowed for off-the-dome picks
alter table public.picks
  drop constraint picks_draft_id_item_id_key;

create unique index picks_draft_id_item_id_key
  on public.picks (draft_id, item_id)
  where item_id is not null;

-- 3. Add freeform pick name column
alter table public.picks
  add column item_name text;

-- 4. Add forfeit indicator (for auto-pick skip in off-the-dome mode)
alter table public.picks
  add column forfeited boolean not null default false;

-- 5. Constraint: normal picks must have either item_id or item_name;
--    forfeited picks have both null
alter table public.picks
  add constraint picks_valid_pick
  check (
    (forfeited = true  and item_id is null and item_name is null)
    or (forfeited = false and item_id is not null and item_name is null)
    or (forfeited = false and item_id is null and item_name is not null and length(btrim(item_name)) > 0)
  );

-- 6. Index for case-insensitive duplicate checking on item_name
create index picks_draft_item_name_lower_idx
  on public.picks (draft_id, lower(btrim(item_name)))
  where item_name is not null;

-- 7. Update safe_drafts view to include picking_mode
drop view if exists public.safe_drafts;

create view public.safe_drafts
with (security_invoker = true) as
select
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, custom_judge_prompt, picking_mode, timer_seconds, pick_order,
  current_pick_index, turn_deadline, created_at, completed_at
from public.drafts;

-- 8. Update safe_picks view to include item_name and forfeited
drop view if exists public.safe_picks;

create view public.safe_picks
with (security_invoker = true) as
select
  id, draft_id, player_id, item_id, item_name, overall_pick, round,
  pick_in_round, is_auto_pick, forfeited, created_at
from public.picks;

-- 9. Re-grant view access (dropped views lose their grants)
revoke all on table public.safe_drafts, public.safe_picks from public;
grant select on table public.safe_drafts, public.safe_picks to anon, authenticated;

-- 10. Grant column-level access for new columns on base tables
grant select (picking_mode) on public.drafts to anon, authenticated;
grant select (item_name, forfeited) on public.picks to anon, authenticated;
