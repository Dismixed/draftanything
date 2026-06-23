-- Auto-advance VOTING → JUDGING when every active player has voted (mirrors defense flow).

create or replace function public.maybe_advance_from_voting(
  p_draft_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_active_player_count integer;
  v_vote_count integer;
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
    and removed_at is null;

  if v_active_player_count = 0 then
    return false;
  end if;

  select count(*) into v_vote_count
  from public.votes
  where draft_id = p_draft_id;

  if v_vote_count < v_active_player_count then
    return false;
  end if;

  update public.drafts
  set phase = 'JUDGING'
  where id = p_draft_id;

  return true;
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

  perform public.maybe_advance_from_voting(p_draft_id);
end;
$$;

-- Repair drafts stuck in VOTING after every player voted before auto-advance shipped.
do $$
declare
  v_draft_id uuid;
begin
  for v_draft_id in
    select d.id
    from public.drafts d
    where d.phase = 'VOTING'
      and exists (
        select 1
        from public.draft_players p
        where p.draft_id = d.id
          and p.removed_at is null
      )
      and (
        select count(*) from public.votes v where v.draft_id = d.id
      ) >= (
        select count(*) from public.draft_players p
        where p.draft_id = d.id
          and p.removed_at is null
      )
  loop
    perform public.maybe_advance_from_voting(v_draft_id);
  end loop;
end;
$$;
