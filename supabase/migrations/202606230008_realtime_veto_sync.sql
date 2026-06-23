-- Realtime + browser grants for veto voting and pending pick state.

alter table public.pick_veto_votes enable row level security;

create policy "Browser roles can read pick veto votes"
  on public.pick_veto_votes for select to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pick_veto_votes'
  ) then
    alter publication supabase_realtime add table public.pick_veto_votes;
  end if;
end
$$;

grant select (pending_pick_id) on public.drafts to anon, authenticated;
grant select (veto_challenge_resolved) on public.picks to anon, authenticated;

drop view if exists public.safe_drafts;

create view public.safe_drafts
with (security_invoker = true) as
select
  id, room_code, topic, phase, max_players, rounds, draft_type, judging_mode,
  ai_personality, custom_judge_prompt, picking_mode, timer_seconds, pick_order,
  current_pick_index, turn_deadline, judging_started_at, pending_pick_id,
  created_at, completed_at
from public.drafts;

revoke all on table public.safe_drafts from public;
grant select on table public.safe_drafts to anon, authenticated;

drop view if exists public.safe_picks;

create view public.safe_picks
with (security_invoker = true) as
select
  id, draft_id, player_id, item_id, item_name, overall_pick, round,
  pick_in_round, is_auto_pick, forfeited, veto_challenge_resolved, created_at
from public.picks;

revoke all on table public.safe_picks from public;
grant select on table public.safe_picks to anon, authenticated;
