-- AI drafters: players with no guest session, and the phase rules that must ignore them.

alter table public.draft_players
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_style text;

alter table public.draft_players alter column guest_id drop not null;

alter table public.draft_players
  add constraint draft_players_bot_shape check (
    (is_bot and guest_id is null
      and bot_style in ('chalk', 'specialist', 'wildcard', 'balancer', 'hipster'))
    or (not is_bot and guest_id is not null and bot_style is null)
  );

alter table public.drafts
  add column if not exists vetoed_names jsonb not null default '[]'::jsonb;

create or replace function public.add_bot_player(
  p_draft_id uuid,
  p_host_guest_id uuid,
  p_display_name text,
  p_bot_style text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_seat integer;
  v_player_id uuid;
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

  if (
    select count(*) from public.draft_players dp
    where dp.draft_id = p_draft_id
      and dp.removed_at is null
  ) >= v_draft.max_players then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.draft_players dp
    where dp.draft_id = p_draft_id
      and dp.removed_at is null
      and lower(dp.display_name) = lower(p_display_name)
  ) then
    raise exception 'NAME_TAKEN' using errcode = 'P0001';
  end if;

  select s into v_seat
  from generate_series(1, v_draft.max_players) as s
  where s not in (
    select dp.seat from public.draft_players dp
    where dp.draft_id = p_draft_id
      and dp.removed_at is null
  )
  order by s
  limit 1;

  insert into public.draft_players (
    draft_id, guest_id, display_name, seat, is_ready, is_bot, bot_style
  ) values (
    p_draft_id, null, p_display_name, v_seat, true, true, p_bot_style
  )
  returning id into v_player_id;

  return v_player_id;
end;
$$;

create or replace function public.remove_bot_player(
  p_draft_id uuid,
  p_host_guest_id uuid,
  p_player_id uuid
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

  if v_draft.host_guest_id != p_host_guest_id then
    raise exception 'NOT_HOST' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  update public.draft_players
  set removed_at = now()
  where id = p_player_id
    and draft_id = p_draft_id
    and is_bot
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_BOT' using errcode = 'P0001';
  end if;
end;
$$;

-- Called with the draft row locked, as a draft leaves the lobby. Renumbers
-- active seats to 1..N in seat order and shrinks the room to N, so the pick
-- order never includes an empty seat. Forces AI judging when one human plays.
create or replace function public._prepare_draft_start(
  p_draft_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_row record;
  v_rank integer := 0;
  v_humans integer;
begin
  -- Ascending order keeps the active-seat unique index satisfied: the row of
  -- rank k moves to seat k, which is its own seat or one vacated earlier.
  for v_row in
    select id, seat from public.draft_players
    where draft_id = p_draft_id
      and removed_at is null
    order by seat
  loop
    v_rank := v_rank + 1;
    if v_row.seat != v_rank then
      update public.draft_players set seat = v_rank where id = v_row.id;
    end if;
  end loop;

  if v_rank < 2 then
    raise exception 'NOT_ENOUGH_PLAYERS' using errcode = 'P0001';
  end if;

  select count(*) into v_humans
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null
    and not is_bot;

  update public.drafts
  set
    max_players = v_rank,
    judging_mode = case
      when v_humans = 1 then 'ai'::public.judging_mode
      else judging_mode
    end
  where id = p_draft_id;
end;
$$;

create or replace function public.commence_off_the_dome(
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

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  if v_draft.picking_mode != 'off_the_dome' then
    raise exception 'INVALID_INPUT: draft is not off-the-dome' using errcode = 'P0001';
  end if;

  perform public._prepare_draft_start(p_draft_id);

  update public.drafts
  set phase = 'DRAFTING'
  where id = p_draft_id;
end;
$$;

-- Makes the pick for the AI drafter on the clock. Service role only: the
-- caller is the server, which has already chosen the item.
create or replace function public.submit_bot_pick(
  p_draft_id uuid,
  p_expected_pick integer,
  p_item_id uuid default null,
  p_item_name text default null,
  p_forfeited boolean default false
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
  v_slot jsonb;
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

  if v_draft.current_pick_index >= jsonb_array_length(v_draft.pick_order) then
    raise exception 'INVALID_PHASE: draft is complete' using errcode = 'P0001';
  end if;

  v_slot := v_draft.pick_order -> v_draft.current_pick_index;

  select id into v_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and seat = (v_slot->>'seat')::integer
    and removed_at is null
    and is_bot;

  if not found then
    raise exception 'NOT_BOT_TURN' using errcode = 'P0001';
  end if;

  if p_forfeited then
    insert into public.picks (
      draft_id, player_id, item_id, item_name,
      overall_pick, round, pick_in_round, is_auto_pick, forfeited
    ) values (
      p_draft_id, v_player_id, null, null,
      (v_slot->>'overallPick')::integer, (v_slot->>'round')::smallint,
      (v_slot->>'pickInRound')::smallint, true, true
    );

  elsif v_draft.picking_mode = 'off_the_dome' then
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
      p_draft_id, v_player_id, null, btrim(p_item_name),
      (v_slot->>'overallPick')::integer, (v_slot->>'round')::smallint,
      (v_slot->>'pickInRound')::smallint, false, false
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
      (v_slot->>'overallPick')::integer, (v_slot->>'round')::smallint,
      (v_slot->>'pickInRound')::smallint, false
    );

    update public.draft_items
    set is_available = false
    where id = p_item_id;
  end if;

  return query
  select adv.o_current_pick_index, adv.o_phase, adv.o_turn_deadline
  from public._advance_draft_after_pick(
    p_draft_id,
    v_draft.current_pick_index + 1,
    v_draft.timer_seconds
  ) as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
end;
$$;

-- These take no caller identity a browser could prove, so only the server may call them.
revoke all on function public.submit_bot_pick(uuid, integer, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public._prepare_draft_start(uuid) from public, anon, authenticated;
grant execute on function public.submit_bot_pick(uuid, integer, uuid, text, boolean) to service_role;
grant execute on function public._prepare_draft_start(uuid) to service_role;

-- Compact seats and settle judging mode as the draft leaves the lobby.
create or replace function public.start_pool_review(
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

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  perform public._prepare_draft_start(p_draft_id);

  update public.drafts
  set phase = 'POOL_REVIEW'
  where id = p_draft_id;
end;
$$;

-- AI drafters never vote on vetoes; remember vetoed names so they are not picked again.
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
    and id != v_picker_player_id
    and not is_bot;

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
    update public.drafts d
    set vetoed_names = d.vetoed_names || to_jsonb(p.item_name)
    from public.picks p
    where d.id = p_draft_id
      and p.id = v_draft.pending_pick_id
      and p.item_name is not null;

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

-- Only humans can be asked to vote on a challenge.
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
    and not is_bot
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

-- AI drafters skip their defense so the phase waits on humans only.
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

  insert into public.arguments (draft_id, player_id, defense_text, skipped)
  select p_draft_id, dp.id, null, true
  from public.draft_players dp
  where dp.draft_id = p_draft_id
    and dp.removed_at is null
    and dp.is_bot
  on conflict on constraint arguments_draft_id_player_id_key do nothing;
end;
$$;

-- Voting is complete when every human has voted.
create or replace function public.maybe_advance_from_voting(
  p_draft_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_active_player_count integer;
  v_active_vote_count integer;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found or v_draft.phase != 'VOTING' then
    return false;
  end if;

  select count(*) into v_active_player_count
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null
    and not is_bot;

  if v_active_player_count = 0 then
    return false;
  end if;

  select count(*) into v_active_vote_count
  from public.votes v
  inner join public.draft_players p
    on p.id = v.voter_player_id
   and p.draft_id = v.draft_id
  where v.draft_id = p_draft_id
    and p.removed_at is null;

  if v_active_vote_count < v_active_player_count then
    return false;
  end if;

  update public.drafts
  set phase = 'JUDGING'
  where id = p_draft_id;

  return true;
end;
$$;

create or replace function public.advance_phase(
  p_draft_id uuid,
  p_guest_id uuid
) returns table (
  o_phase text
)
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_judging_mode text;
  v_all_votes_in boolean;
  v_active_player_count integer;
  v_active_vote_count integer;
  v_judgment_exists boolean;
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

  v_judging_mode := v_draft.judging_mode::text;

  if v_draft.phase = 'DEFENSE' then
    if v_judging_mode = 'ai' then
      update public.drafts
      set phase = 'JUDGING'
      where id = p_draft_id;

      return query select 'JUDGING'::text as o_phase;
    else
      update public.drafts
      set phase = 'VOTING'
      where id = p_draft_id;

      return query select 'VOTING'::text as o_phase;
    end if;

  elsif v_draft.phase = 'VOTING' then
    select count(*) into v_active_player_count
    from public.draft_players
    where draft_id = p_draft_id
      and removed_at is null
      and not is_bot;

    select count(*) into v_active_vote_count
    from public.votes v
    inner join public.draft_players p
      on p.id = v.voter_player_id
     and p.draft_id = v.draft_id
    where v.draft_id = p_draft_id
      and p.removed_at is null;

    v_all_votes_in := v_active_vote_count >= v_active_player_count;

    if v_judging_mode = 'community' then
      if not v_all_votes_in then
        raise exception 'VOTES_INCOMPLETE' using errcode = 'P0001';
      end if;

      update public.drafts
      set phase = 'JUDGING'
      where id = p_draft_id;

      return query select 'JUDGING'::text as o_phase;
    else
      -- hybrid: advance even if votes incomplete; orchestration handles the rest
      update public.drafts
      set phase = 'JUDGING'
      where id = p_draft_id;

      return query select 'JUDGING'::text as o_phase;
    end if;

  elsif v_draft.phase = 'JUDGING' then
    select exists(
      select 1 from public.judgments
      where draft_id = p_draft_id
    ) into v_judgment_exists;

    if not v_judgment_exists then
      raise exception 'NO_JUDGMENT' using errcode = 'P0001';
    end if;

    update public.drafts
    set phase = 'COMPLETE',
        completed_at = now()
    where id = p_draft_id;

    return query select 'COMPLETE'::text as o_phase;

  else
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;
end;
$$;

-- Hosting passes to a human, never an AI drafter.
create or replace function public.leave_draft(
  p_draft_id uuid,
  p_guest_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_player draft_players%rowtype;
  v_new_host_guest_id uuid;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select * into v_player from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    return;
  end if;

  update public.draft_players
  set removed_at = now()
  where id = v_player.id;

  if v_draft.host_guest_id = p_guest_id then
    select dp.guest_id into v_new_host_guest_id
    from public.draft_players dp
    where dp.draft_id = p_draft_id
      and dp.removed_at is null
      and not dp.is_bot
    order by dp.seat
    limit 1;

    if v_new_host_guest_id is not null then
      update public.drafts
      set host_guest_id = v_new_host_guest_id
      where id = p_draft_id;
    end if;
  end if;
end;
$$;

create or replace function public.reset_draft_for_rematch(
  p_draft_id uuid,
  p_host_guest_id uuid
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

  if v_draft.host_guest_id != p_host_guest_id then
    raise exception 'NOT_HOST' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'COMPLETE' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  delete from public.picks where draft_id = p_draft_id;
  delete from public.draft_items where draft_id = p_draft_id;
  delete from public.pool_suggestions where draft_id = p_draft_id;
  delete from public.commentary where draft_id = p_draft_id;
  delete from public.arguments where draft_id = p_draft_id;
  delete from public.votes where draft_id = p_draft_id;
  delete from public.judgments where draft_id = p_draft_id;

  update public.drafts
  set
    phase = 'LOBBY',
    pick_order = '[]'::jsonb,
    current_pick_index = 0,
    turn_deadline = null,
    completed_at = null,
    rubric = '{}'::jsonb,
    judging_started_at = null,
    vetoed_names = '[]'::jsonb
  where id = p_draft_id;
end;
$$;
