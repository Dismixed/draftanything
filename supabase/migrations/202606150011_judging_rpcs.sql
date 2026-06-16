create or replace function public.submit_defense(
  p_draft_id uuid,
  p_guest_id uuid,
  p_defense_text text default null,
  p_skipped boolean default false
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_player_id uuid;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'DEFENSE' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select id into v_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_PLAYER' using errcode = 'P0001';
  end if;

  insert into public.arguments (draft_id, player_id, defense_text, skipped)
  values (p_draft_id, v_player_id, p_defense_text, p_skipped)
  on conflict on constraint arguments_draft_id_player_id_key
  do update set
    defense_text = excluded.defense_text,
    skipped = excluded.skipped,
    submitted_at = now();
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
  v_vote_count integer;
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
      and removed_at is null;

    select count(*) into v_vote_count
    from public.votes
    where draft_id = p_draft_id;

    v_all_votes_in := v_vote_count >= v_active_player_count;

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

create or replace function public.submit_vote(
  p_draft_id uuid,
  p_guest_id uuid,
  p_selected_player_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_voter_player_id uuid;
begin
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'VOTING' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select id into v_voter_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_PLAYER' using errcode = 'P0001';
  end if;

  if v_voter_player_id = p_selected_player_id then
    raise exception 'SELF_VOTE' using errcode = 'P0001';
  end if;

  insert into public.votes (draft_id, voter_player_id, selected_player_id)
  values (p_draft_id, v_voter_player_id, p_selected_player_id)
  on conflict on constraint votes_draft_id_voter_player_id_key
  do update set
    selected_player_id = excluded.selected_player_id,
    created_at = now();
end;
$$;
