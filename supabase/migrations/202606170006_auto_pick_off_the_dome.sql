-- Update auto_pick RPC to handle off-the-dome mode (forfeit instead of picking)

create or replace function public.auto_pick(
  p_draft_id uuid,
  p_guest_id uuid
) returns table (
  o_current_pick_index integer,
  o_phase text,
  o_turn_deadline timestamptz
)
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_player_id uuid;
  v_seat integer;
  v_slot jsonb;
  v_round smallint;
  v_pick_in_round smallint;
  v_overall_pick integer;
  v_total_slots integer;
  v_next_pick_index integer;
  v_auto_item_id uuid;
  v_existing_pick_id uuid;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'DRAFTING' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  if v_draft.timer_seconds is null then
    raise exception 'NO_TIMER: timer is not enabled for this draft' using errcode = 'P0001';
  end if;

  if v_draft.turn_deadline is null then
    raise exception 'NO_DEADLINE: no turn deadline set' using errcode = 'P0001';
  end if;

  if v_draft.turn_deadline > now() then
    raise exception 'TIMER_NOT_EXPIRED: deadline has not yet passed' using errcode = 'P0001';
  end if;

  v_total_slots := jsonb_array_length(v_draft.pick_order);

  if v_draft.current_pick_index >= v_total_slots then
    raise exception 'INVALID_PHASE: draft is complete' using errcode = 'P0001';
  end if;

  v_slot := v_draft.pick_order -> v_draft.current_pick_index;
  v_seat := (v_slot->>'seat')::integer;
  v_round := (v_slot->>'round')::smallint;
  v_pick_in_round := (v_slot->>'pickInRound')::smallint;
  v_overall_pick := (v_slot->>'overallPick')::integer;

  select id into v_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and seat = v_seat
    and removed_at is null;

  if not found then
    raise exception 'NOT_YOUR_TURN: seat % expected', v_seat using errcode = 'P0001';
  end if;

  -- Check if this slot already has a pick (idempotency for concurrent calls)
  select id into v_existing_pick_id
  from public.picks
  where draft_id = p_draft_id
    and overall_pick = v_overall_pick;

  if found then
    v_next_pick_index := v_draft.current_pick_index + 1;

    if v_next_pick_index >= v_total_slots then
      return query
      select
        v_next_pick_index::integer as o_current_pick_index,
        'DEFENSE'::text as o_phase,
        null::timestamptz as o_turn_deadline;
    else
      return query
      select
        v_next_pick_index::integer as o_current_pick_index,
        'DRAFTING'::text as o_phase,
        v_draft.turn_deadline as o_turn_deadline;
    end if;
    return;
  end if;

  -- Off-the-dome mode: forfeit the turn
  if v_draft.picking_mode = 'off_the_dome' then
    insert into public.picks (
      draft_id, player_id, item_id, item_name,
      overall_pick, round, pick_in_round, is_auto_pick, forfeited
    ) values (
      p_draft_id, v_player_id, null, null,
      v_overall_pick, v_round, v_pick_in_round, true, true
    );

  else
    -- Pool mode: pick first available item (alphabetically for determinism)
    select id into v_auto_item_id
    from public.draft_items
    where draft_id = p_draft_id
      and is_available = true
    order by normalized_name asc
    limit 1;

    if not found then
      raise exception 'NO_AVAILABLE_ITEMS' using errcode = 'P0001';
    end if;

    insert into public.picks (
      draft_id, player_id, item_id,
      overall_pick, round, pick_in_round, is_auto_pick
    ) values (
      p_draft_id, v_player_id, v_auto_item_id,
      v_overall_pick, v_round, v_pick_in_round, true
    );

    update public.draft_items
    set is_available = false
    where id = v_auto_item_id;
  end if;

  v_next_pick_index := v_draft.current_pick_index + 1;

  if v_next_pick_index >= v_total_slots then
    update public.drafts
    set
      current_pick_index = v_next_pick_index,
      phase = 'DEFENSE',
      turn_deadline = null,
      completed_at = now()
    where id = p_draft_id;

    return query
    select
      v_next_pick_index::integer as o_current_pick_index,
      'DEFENSE'::text as o_phase,
      null::timestamptz as o_turn_deadline;
  else
    update public.drafts
    set
      current_pick_index = v_next_pick_index,
      turn_deadline = now() + (v_draft.timer_seconds * interval '1 second')
    where id = p_draft_id;

    return query
    select
      v_next_pick_index::integer as o_current_pick_index,
      'DRAFTING'::text as o_phase,
      now() + (v_draft.timer_seconds * interval '1 second') as o_turn_deadline;
  end if;
end;
$$;
