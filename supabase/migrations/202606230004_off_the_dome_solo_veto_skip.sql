-- Skip veto voting when no other players can vote (solo drafts or picker is alone).

create or replace function public.submit_pick(
  p_draft_id uuid,
  p_guest_id uuid,
  p_item_id uuid default null,
  p_expected_pick integer default 0,
  p_item_name text default null
) returns table (
  o_current_pick_index integer,
  o_phase text,
  o_turn_deadline timestamptz,
  o_pending_pick_id uuid
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
  v_item_available boolean;
  v_new_pick_id uuid;
  v_eligible_voters integer;
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
    )
    returning id into v_new_pick_id;

    select count(*) into v_eligible_voters
    from public.draft_players
    where draft_id = p_draft_id
      and removed_at is null
      and id != v_player_id;

    if v_eligible_voters = 0 then
      update public.drafts
      set pending_pick_id = v_new_pick_id
      where id = p_draft_id;

      return query
      select
        adv.o_current_pick_index,
        adv.o_phase,
        adv.o_turn_deadline,
        adv.o_confirmed_pick_id
      from public._advance_draft_after_pick(
        p_draft_id,
        v_draft.current_pick_index + 1,
        v_draft.timer_seconds
      ) as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
    end if;

    update public.drafts
    set
      phase = 'VETO_VOTING',
      pending_pick_id = v_new_pick_id,
      turn_deadline = null
    where id = p_draft_id;

    return query
    select
      v_draft.current_pick_index::integer,
      'VETO_VOTING'::text,
      null::timestamptz,
      v_new_pick_id;

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

    return query
    select
      adv.o_current_pick_index,
      adv.o_phase,
      adv.o_turn_deadline,
      null::uuid
    from public._advance_draft_after_pick(
      p_draft_id,
      v_draft.current_pick_index + 1,
      v_draft.timer_seconds
    ) as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
  end if;
end;
$$;

-- Heal drafts stuck in VETO_VOTING (e.g. solo play before auto-skip existed).
create or replace function public.maybe_resolve_veto_voting(
  p_draft_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_result record;
begin
  for v_result in
    select * from public._resolve_veto_voting(p_draft_id)
  loop
    return;
  end loop;
end;
$$;
