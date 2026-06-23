-- Opt-in veto: picks lock in immediately; any non-picker can challenge the latest pick.

alter table public.drafts
  add column if not exists veto_suspended_pick_index integer;

alter table public.picks
  add column if not exists veto_challenge_resolved boolean not null default false;

create or replace function public._pick_order_index_for_overall_pick(
  p_pick_order jsonb,
  p_overall_pick integer
) returns integer
language sql
immutable
as $$
  select gs.i
  from generate_series(0, jsonb_array_length(p_pick_order) - 1) as gs(i)
  where (p_pick_order -> gs.i ->> 'overallPick')::integer = p_overall_pick
  limit 1;
$$;

create or replace function public._resolve_veto_voting(
  p_draft_id uuid
) returns table (
  o_current_pick_index integer,
  o_phase text,
  o_turn_deadline timestamptz,
  o_vetoed boolean,
  o_confirmed_pick_id uuid
)
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_picker_player_id uuid;
  v_eligible_count integer;
  v_votes_cast integer;
  v_veto_count integer;
  v_votes_needed integer;
  v_max_possible_vetoes integer;
  v_overall_pick integer;
  v_pick_index integer;
  v_resume_index integer;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if v_draft.phase != 'VETO_VOTING' or v_draft.pending_pick_id is null then
    return;
  end if;

  select player_id, overall_pick
  into v_picker_player_id, v_overall_pick
  from public.picks
  where id = v_draft.pending_pick_id;

  select count(*) into v_eligible_count
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null
    and id != v_picker_player_id;

  select
    count(*),
    count(*) filter (where wants_veto)
  into v_votes_cast, v_veto_count
  from public.pick_veto_votes
  where draft_id = p_draft_id
    and pick_id = v_draft.pending_pick_id;

  v_votes_needed := floor(v_eligible_count::numeric / 2)::integer + 1;
  v_max_possible_vetoes := v_veto_count + (v_eligible_count - v_votes_cast);
  v_resume_index := coalesce(v_draft.veto_suspended_pick_index, v_draft.current_pick_index);

  if v_veto_count >= v_votes_needed then
    delete from public.commentary
    where pick_id = v_draft.pending_pick_id;

    delete from public.picks
    where id = v_draft.pending_pick_id;

    v_pick_index := public._pick_order_index_for_overall_pick(
      v_draft.pick_order,
      v_overall_pick
    );

    update public.drafts
    set
      phase = 'DRAFTING',
      current_pick_index = v_pick_index,
      pending_pick_id = null,
      veto_suspended_pick_index = null,
      turn_deadline = case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end
    where id = p_draft_id;

    return query
    select
      v_pick_index::integer,
      'DRAFTING'::text,
      case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end::timestamptz,
      true,
      null::uuid;
    return;
  end if;

  if v_votes_cast >= v_eligible_count or v_max_possible_vetoes < v_votes_needed then
    update public.picks
    set veto_challenge_resolved = true
    where id = v_draft.pending_pick_id;

    update public.drafts
    set
      phase = 'DRAFTING',
      current_pick_index = v_resume_index,
      pending_pick_id = null,
      veto_suspended_pick_index = null,
      turn_deadline = case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end
    where id = p_draft_id;

    return query
    select
      v_resume_index::integer,
      'DRAFTING'::text,
      case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end::timestamptz,
      false,
      v_draft.pending_pick_id;
    return;
  end if;
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

create or replace function public.initiate_veto(
  p_draft_id uuid,
  p_guest_id uuid
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
  v_initiator_player_id uuid;
  v_last_pick picks%rowtype;
  v_eligible_count integer;
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

  if v_draft.picking_mode != 'off_the_dome' then
    raise exception 'INVALID_PHASE: veto is only for off-the-dome mode' using errcode = 'P0001';
  end if;

  select id into v_initiator_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_PLAYER' using errcode = 'P0001';
  end if;

  select * into v_last_pick
  from public.picks
  where draft_id = p_draft_id
    and not forfeited
  order by overall_pick desc
  limit 1;

  if not found then
    raise exception 'NO_PICK_TO_VETO' using errcode = 'P0001';
  end if;

  if v_last_pick.veto_challenge_resolved then
    raise exception 'VETO_ALREADY_RESOLVED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.pick_veto_votes
    where draft_id = p_draft_id
      and pick_id = v_last_pick.id
  ) then
    raise exception 'VETO_ALREADY_CHALLENGED' using errcode = 'P0001';
  end if;

  if v_last_pick.player_id = v_initiator_player_id then
    raise exception 'PICKER_CANNOT_INITIATE' using errcode = 'P0001';
  end if;

  select count(*) into v_eligible_count
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null
    and id != v_last_pick.player_id;

  if v_eligible_count = 0 then
    raise exception 'NO_ELIGIBLE_VOTERS' using errcode = 'P0001';
  end if;

  update public.drafts
  set
    phase = 'VETO_VOTING',
    pending_pick_id = v_last_pick.id,
    veto_suspended_pick_index = current_pick_index,
    turn_deadline = null
  where id = p_draft_id;

  return query
  select
    v_draft.current_pick_index::integer,
    'VETO_VOTING'::text,
    null::timestamptz,
    v_last_pick.id;
end;
$$;
