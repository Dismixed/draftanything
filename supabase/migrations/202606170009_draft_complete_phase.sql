-- Pause between drafting and defense so the host can review rosters first.

alter type public.draft_phase add value if not exists 'DRAFT_COMPLETE' after 'DRAFTING';

create or replace function public.start_defense(
  p_draft_id uuid,
  p_guest_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.host_guest_id != p_guest_id then
    raise exception 'NOT_HOST' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'DRAFT_COMPLETE' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  update public.drafts
  set phase = 'DEFENSE'
  where id = p_draft_id;
end;
$$;

create or replace function public.submit_pick(
  p_draft_id uuid,
  p_guest_id uuid,
  p_item_id uuid default null,
  p_expected_pick integer default 0,
  p_item_name text default null
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
  v_item_available boolean;
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

  if p_expected_pick != v_draft.current_pick_index then
    raise exception 'STALE_STATE: expected pick %, current pick %', p_expected_pick, v_draft.current_pick_index using errcode = 'P0001';
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

  if v_draft.picking_mode = 'off_the_dome' then
    if p_item_name is null or length(btrim(p_item_name)) = 0 then
      raise exception 'INVALID_INPUT: item_name is required for off-the-dome mode' using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.picks
      where draft_id = p_draft_id
        and lower(btrim(item_name)) = lower(btrim(p_item_name))
    ) then
      raise exception 'ITEM_UNAVAILABLE: duplicate item name' using errcode = 'P0001';
    end if;

    insert into public.picks (
      draft_id, player_id, item_id, item_name,
      overall_pick, round, pick_in_round, is_auto_pick, forfeited
    ) values (
      p_draft_id, v_player_id, null, p_item_name,
      v_overall_pick, v_round, v_pick_in_round, false, false
    );

  else
    select is_available into v_item_available
    from public.draft_items
    where id = p_item_id
      and draft_id = p_draft_id;

    if not found then
      raise exception 'INVALID_INPUT: item not found in draft' using errcode = 'P0001';
    end if;

    if not v_item_available then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;

    insert into public.picks (
      draft_id, player_id, item_id,
      overall_pick, round, pick_in_round, is_auto_pick
    ) values (
      p_draft_id, v_player_id, p_item_id,
      v_overall_pick, v_round, v_pick_in_round, false
    );

    update public.draft_items
    set is_available = false
    where id = p_item_id;
  end if;

  v_next_pick_index := v_draft.current_pick_index + 1;

  if v_next_pick_index >= v_total_slots then
    update public.drafts
    set
      current_pick_index = v_next_pick_index,
      phase = 'DRAFT_COMPLETE',
      turn_deadline = null,
      completed_at = now()
    where id = p_draft_id;

    return query
    select
      v_next_pick_index::integer as o_current_pick_index,
      'DRAFT_COMPLETE'::text as o_phase,
      null::timestamptz as o_turn_deadline;
  else
    update public.drafts
    set
      current_pick_index = v_next_pick_index,
      turn_deadline = case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end
    where id = p_draft_id;

    return query
    select
      v_next_pick_index::integer as o_current_pick_index,
      'DRAFTING'::text as o_phase,
      case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end::timestamptz as o_turn_deadline;
  end if;
end;
$$;

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
        coalesce(v_draft.phase::text, 'DRAFT_COMPLETE') as o_phase,
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

  if v_draft.picking_mode = 'off_the_dome' then
    insert into public.picks (
      draft_id, player_id, item_id, item_name,
      overall_pick, round, pick_in_round, is_auto_pick, forfeited
    ) values (
      p_draft_id, v_player_id, null, null,
      v_overall_pick, v_round, v_pick_in_round, true, true
    );

  else
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
      phase = 'DRAFT_COMPLETE',
      turn_deadline = null,
      completed_at = now()
    where id = p_draft_id;

    return query
    select
      v_next_pick_index::integer as o_current_pick_index,
      'DRAFT_COMPLETE'::text as o_phase,
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
