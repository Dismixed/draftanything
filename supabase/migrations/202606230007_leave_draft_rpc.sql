-- Soft-remove a player from a LOBBY-phase draft. Transfers host to the next
-- active player by seat when the host leaves.
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

-- join_draft should only consider active (non-removed) players for capacity,
-- name uniqueness, seat allocation, and re-join detection.
create or replace function public.join_draft(
  p_draft_id uuid,
  p_guest_id uuid,
  p_display_name text
) returns table (
  player_id uuid,
  seat integer,
  draft_id uuid
)
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

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.draft_players
    where draft_players.draft_id = p_draft_id
      and removed_at is null
  ) >= v_draft.max_players then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.draft_players
    where draft_players.draft_id = p_draft_id
      and removed_at is null
      and lower(display_name) = lower(p_display_name)
  ) then
    raise exception 'NAME_TAKEN' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.draft_players
    where draft_players.draft_id = p_draft_id
      and guest_id = p_guest_id
      and removed_at is null
  ) then
    select dp.id, dp.seat into v_player_id, v_seat
    from public.draft_players dp
    where dp.draft_id = p_draft_id
      and dp.guest_id = p_guest_id
      and dp.removed_at is null;
    return query select v_player_id, v_seat, p_draft_id;
    return;
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

  insert into public.draft_players (draft_id, guest_id, display_name, seat)
  values (p_draft_id, p_guest_id, p_display_name, v_seat)
  returning id into v_player_id;

  return query select v_player_id, v_seat, p_draft_id;
end;
$$;
