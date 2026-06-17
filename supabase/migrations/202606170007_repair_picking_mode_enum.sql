-- Repair: remote applied an older text-based picking_mode column before the enum
-- migration was finalized. create_draft casts to public.picking_mode, so the enum
-- must exist and the column must use it.

do $$
begin
  create type public.picking_mode as enum ('pool', 'off_the_dome');
exception
  when duplicate_object then null;
end;
$$;

alter table public.drafts
  drop constraint if exists drafts_picking_mode_values;

drop view if exists public.safe_drafts;

alter table public.drafts
  alter column picking_mode drop default;

alter table public.drafts
  alter column picking_mode type public.picking_mode
  using picking_mode::public.picking_mode;

alter table public.drafts
  alter column picking_mode set default 'pool'::public.picking_mode;

alter table public.drafts
  alter column picking_mode set not null;

create view public.safe_drafts
with (security_invoker = true) as
select
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, custom_judge_prompt, picking_mode, timer_seconds, pick_order,
  current_pick_index, turn_deadline, created_at, completed_at
from public.drafts;

revoke all on table public.safe_drafts from public;
grant select on table public.safe_drafts to anon, authenticated;
grant select (picking_mode) on public.drafts to anon, authenticated;
