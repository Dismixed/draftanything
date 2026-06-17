-- Track in-progress judging so all clients can show evaluating state.

alter table public.drafts
  add column judging_started_at timestamptz;

drop view if exists public.safe_drafts;

create view public.safe_drafts
with (security_invoker = true) as
select
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, custom_judge_prompt, picking_mode, timer_seconds, pick_order,
  current_pick_index, turn_deadline, judging_started_at, created_at, completed_at
from public.drafts;

revoke all on table public.safe_drafts from public;
grant select on table public.safe_drafts to anon, authenticated;

grant select (judging_started_at) on public.drafts to anon, authenticated;
