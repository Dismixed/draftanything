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
  -- Lock the draft row
  select * into v_draft from public.drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draft.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  -- Check capacity
  if (select count(*) from public.draft_players where draft_players.draft_id = p_draft_id) >= v_draft.max_players then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  -- Check name uniqueness
  if exists (
    select 1 from public.draft_players
    where draft_players.draft_id = p_draft_id
    and lower(display_name) = lower(p_display_name)
  ) then
    raise exception 'NAME_TAKEN' using errcode = 'P0001';
  end if;

  -- Already joined? Return existing seat
  if exists (
    select 1 from public.draft_players
    where draft_players.draft_id = p_draft_id
    and guest_id = p_guest_id
  ) then
    select id, seat into v_player_id, v_seat from public.draft_players
    where draft_players.draft_id = p_draft_id and guest_id = p_guest_id;
    return query select v_player_id, v_seat, p_draft_id;
    return;
  end if;

  -- Find lowest open seat (1-indexed, up to max_players)
  select s into v_seat
  from generate_series(1, v_draft.max_players) as s
  where s not in (
    select seat from public.draft_players where draft_players.draft_id = p_draft_id
  )
  order by s
  limit 1;

  -- Insert player
  insert into public.draft_players (draft_id, guest_id, display_name, seat)
  values (p_draft_id, p_guest_id, p_display_name, v_seat)
  returning id into v_player_id;

  return query select v_player_id, v_seat, p_draft_id;
end;
$$;
