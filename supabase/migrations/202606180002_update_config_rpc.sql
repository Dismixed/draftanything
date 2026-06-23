-- Update draft configuration while in LOBBY phase. Host-only.

create or replace function public.update_draft_config(
  p_draft_id uuid,
  p_host_guest_id uuid,
  p_topic text,
  p_max_players smallint,
  p_rounds smallint,
  p_timer_seconds smallint,
  p_draft_type text,
  p_picking_mode text,
  p_judging_mode text,
  p_ai_personality text,
  p_custom_judge_prompt text
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_player_count integer;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.host_guest_id != p_host_guest_id then
    raise exception 'NOT_HOST' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  -- Check that max_players is not below current player count
  select count(*) into v_player_count
  from public.draft_players
  where draft_id = p_draft_id and removed_at is null;

  if p_max_players < v_player_count then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  update public.drafts
  set
    topic = p_topic,
    max_players = p_max_players,
    rounds = p_rounds,
    timer_seconds = p_timer_seconds,
    draft_type = p_draft_type,
    picking_mode = p_picking_mode,
    judging_mode = p_judging_mode,
    ai_personality = p_ai_personality,
    custom_judge_prompt = p_custom_judge_prompt
  where id = p_draft_id;
end;
$$;
