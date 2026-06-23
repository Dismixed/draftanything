-- Off-the-dome pick veto: majority of eligible players can veto a pick before it locks in.

alter type public.draft_phase add value if not exists 'VETO_VOTING' after 'DRAFTING';

alter table public.drafts
  add column if not exists pending_pick_id uuid references public.picks(id) on delete set null;

create table if not exists public.pick_veto_votes (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  pick_id uuid not null references public.picks(id) on delete cascade,
  voter_player_id uuid not null references public.draft_players(id),
  wants_veto boolean not null,
  created_at timestamptz not null default now(),
  constraint pick_veto_votes_unique_voter
    unique (draft_id, pick_id, voter_player_id)
);

create index if not exists pick_veto_votes_draft_pick_idx
  on public.pick_veto_votes (draft_id, pick_id);

revoke all on public.pick_veto_votes from public;
grant select on public.pick_veto_votes to authenticated, anon;

create or replace function public._advance_draft_after_pick(
  p_draft_id uuid,
  p_next_pick_index integer,
  p_timer_seconds smallint
) returns table (
  o_current_pick_index integer,
  o_phase text,
  o_turn_deadline timestamptz,
  o_confirmed_pick_id uuid
)
language plpgsql
security definer
as $$
declare
  v_total_slots integer;
  v_confirmed_pick_id uuid;
begin
  select pending_pick_id into v_confirmed_pick_id
  from public.drafts
  where id = p_draft_id;

  select jsonb_array_length(pick_order) into v_total_slots
  from public.drafts
  where id = p_draft_id;

  if p_next_pick_index >= v_total_slots then
    update public.drafts
    set
      current_pick_index = p_next_pick_index,
      phase = 'DRAFT_COMPLETE',
      turn_deadline = null,
      pending_pick_id = null,
      completed_at = now()
    where id = p_draft_id;

    return query
    select
      p_next_pick_index::integer,
      'DRAFT_COMPLETE'::text,
      null::timestamptz,
      v_confirmed_pick_id;
  else
    update public.drafts
    set
      current_pick_index = p_next_pick_index,
      phase = 'DRAFTING',
      turn_deadline = case
        when p_timer_seconds is not null
        then now() + (p_timer_seconds * interval '1 second')
        else null
      end,
      pending_pick_id = null
    where id = p_draft_id;

    return query
    select
      p_next_pick_index::integer,
      'DRAFTING'::text,
      case
        when p_timer_seconds is not null
        then now() + (p_timer_seconds * interval '1 second')
        else null
      end::timestamptz,
      v_confirmed_pick_id;
  end if;
end;
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
  v_next_pick_index integer;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if v_draft.phase != 'VETO_VOTING' or v_draft.pending_pick_id is null then
    return;
  end if;

  select player_id into v_picker_player_id
  from public.picks
  where id = v_draft.pending_pick_id;

  select count(*) into v_eligible_count
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null
    and id != v_picker_player_id;

  if v_eligible_count = 0 then
    v_next_pick_index := v_draft.current_pick_index + 1;
    return query
    select
      adv.o_current_pick_index,
      adv.o_phase,
      adv.o_turn_deadline,
      false,
      adv.o_confirmed_pick_id
    from public._advance_draft_after_pick(
      p_draft_id,
      v_next_pick_index,
      v_draft.timer_seconds
    ) as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
    return;
  end if;

  select
    count(*),
    count(*) filter (where wants_veto)
  into v_votes_cast, v_veto_count
  from public.pick_veto_votes
  where draft_id = p_draft_id
    and pick_id = v_draft.pending_pick_id;

  v_votes_needed := floor(v_eligible_count::numeric / 2)::integer + 1;
  v_max_possible_vetoes := v_veto_count + (v_eligible_count - v_votes_cast);

  if v_veto_count >= v_votes_needed then
    delete from public.commentary
    where pick_id = v_draft.pending_pick_id;

    delete from public.picks
    where id = v_draft.pending_pick_id;

    update public.drafts
    set
      phase = 'DRAFTING',
      pending_pick_id = null,
      turn_deadline = case
        when v_draft.timer_seconds is not null
        then now() + (v_draft.timer_seconds * interval '1 second')
        else null
      end
    where id = p_draft_id;

    return query
    select
      v_draft.current_pick_index::integer,
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
    v_next_pick_index := v_draft.current_pick_index + 1;
    return query
    select
      adv.o_current_pick_index,
      adv.o_phase,
      adv.o_turn_deadline,
      false,
      adv.o_confirmed_pick_id
    from public._advance_draft_after_pick(
      p_draft_id,
      v_next_pick_index,
      v_draft.timer_seconds
    ) as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
    return;
  end if;
end;
$$;

-- submit_pick return type gains o_pending_pick_id; CREATE OR REPLACE cannot change OUT columns.
drop function if exists public.submit_pick(uuid, uuid, uuid, integer, text);

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

create or replace function public.submit_veto_vote(
  p_draft_id uuid,
  p_guest_id uuid,
  p_wants_veto boolean
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
  v_voter_player_id uuid;
  v_picker_player_id uuid;
  v_result record;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'VETO_VOTING' or v_draft.pending_pick_id is null then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  if v_draft.picking_mode != 'off_the_dome' then
    raise exception 'INVALID_PHASE: veto voting is only for off-the-dome mode' using errcode = 'P0001';
  end if;

  select id into v_voter_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_PLAYER' using errcode = 'P0001';
  end if;

  select player_id into v_picker_player_id
  from public.picks
  where id = v_draft.pending_pick_id;

  if v_voter_player_id = v_picker_player_id then
    raise exception 'PICKER_CANNOT_VOTE' using errcode = 'P0001';
  end if;

  insert into public.pick_veto_votes (
    draft_id, pick_id, voter_player_id, wants_veto
  ) values (
    p_draft_id, v_draft.pending_pick_id, v_voter_player_id, p_wants_veto
  )
  on conflict on constraint pick_veto_votes_unique_voter
  do update set wants_veto = excluded.wants_veto;

  for v_result in
    select * from public._resolve_veto_voting(p_draft_id)
  loop
    return query
    select
      v_result.o_current_pick_index,
      v_result.o_phase,
      v_result.o_turn_deadline,
      v_result.o_vetoed,
      v_result.o_confirmed_pick_id;
    return;
  end loop;

  select * into v_draft from public.drafts where id = p_draft_id;

  return query
  select
    v_draft.current_pick_index::integer,
    'VETO_VOTING'::text,
    null::timestamptz,
    false,
    null::uuid;
end;
$$;
