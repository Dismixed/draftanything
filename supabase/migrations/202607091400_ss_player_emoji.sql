-- Player emoji tokens for Slippery Slope

alter table public.ss_players
  add column if not exists emoji text not null default '🎯';

-- Backfill defaults by seat for any existing rows
update public.ss_players
set emoji = (array['🎯', '🐸', '🦊', '🐙', '🦄', '🐼'])[seat]
where emoji = '🎯' or emoji is null;

revoke all on table public.ss_players from anon, authenticated;

grant select (
  id, room_id, display_name, seat, color_index, position, emoji, joined_at, removed_at
) on public.ss_players to anon, authenticated;

-- ── create_ss_room (set default emoji for host) ─────────────────

create or replace function public.create_ss_room(
  p_host_guest_id uuid,
  p_display_name text,
  p_category text,
  p_max_players integer
) returns table (room_id uuid, room_code text, player_id uuid)
language plpgsql security definer as $$
declare
  v_room_code text;
  v_room_id uuid;
  v_player_id uuid;
  v_attempts integer := 0;
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code_len integer := 6;
  v_rand_bytes bytea;
  i integer;
begin
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'ROOM_CODE_CONFLICT' using errcode = 'P0001';
    end if;

    v_rand_bytes := extensions.gen_random_bytes(v_code_len);
    v_room_code := '';
    for i in 0 .. v_code_len - 1 loop
      v_room_code := v_room_code ||
        substr(v_alphabet, (get_byte(v_rand_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;

    begin
      insert into public.ss_rooms (room_code, host_guest_id, category, max_players)
      values (v_room_code, p_host_guest_id, p_category, p_max_players)
      returning id into v_room_id;

      insert into public.ss_players (room_id, guest_id, display_name, seat, color_index, emoji)
      values (v_room_id, p_host_guest_id, p_display_name, 1, 0, '🎯')
      returning id into v_player_id;

      return query select v_room_id, v_room_code, v_player_id;
      return;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

-- ── join_ss_room (set default emoji by seat) ────────────────────

create or replace function public.join_ss_room(
  p_room_id uuid,
  p_guest_id uuid,
  p_display_name text
) returns table (player_id uuid, seat integer, room_id uuid)
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
  v_seat integer;
  v_player_id uuid;
  v_count integer;
  v_default_emojis text[] := array['🎯', '🐸', '🦊', '🐙', '🦄', '🐼'];
begin
  select * into v_room from public.ss_rooms where id = p_room_id for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_room.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select count(*) into v_count
  from public.ss_players
  where ss_players.room_id = p_room_id and removed_at is null;

  if v_count >= v_room.max_players then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.ss_players
    where ss_players.room_id = p_room_id
      and removed_at is null
      and lower(display_name) = lower(p_display_name)
      and guest_id != p_guest_id
  ) then
    raise exception 'NAME_TAKEN' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.ss_players
    where ss_players.room_id = p_room_id and guest_id = p_guest_id and removed_at is null
  ) then
    select sp.id, sp.seat into v_player_id, v_seat
    from public.ss_players sp
    where sp.room_id = p_room_id and sp.guest_id = p_guest_id and sp.removed_at is null;
    return query select v_player_id, v_seat, p_room_id;
    return;
  end if;

  select s into v_seat
  from generate_series(1, v_room.max_players) as s
  where s not in (
    select sp.seat from public.ss_players sp
    where sp.room_id = p_room_id and sp.removed_at is null
  )
  order by s
  limit 1;

  insert into public.ss_players (room_id, guest_id, display_name, seat, color_index, emoji)
  values (
    p_room_id,
    p_guest_id,
    p_display_name,
    v_seat,
    v_seat - 1,
    v_default_emojis[v_seat]
  )
  returning id into v_player_id;

  return query select v_player_id, v_seat, p_room_id;
end;
$$;

-- ── update_ss_player_emoji ──────────────────────────────────────

create or replace function public.update_ss_player_emoji(
  p_room_id uuid,
  p_guest_id uuid,
  p_emoji text
) returns void
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
begin
  if p_emoji is null or length(p_emoji) = 0 or length(p_emoji) > 8 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  select * into v_room from public.ss_rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_room.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.ss_players
    where room_id = p_room_id and guest_id = p_guest_id and removed_at is null
  ) then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.ss_players
    where room_id = p_room_id
      and guest_id != p_guest_id
      and removed_at is null
      and emoji = p_emoji
  ) then
    raise exception 'EMOJI_TAKEN' using errcode = 'P0001';
  end if;

  update public.ss_players
  set emoji = p_emoji
  where room_id = p_room_id and guest_id = p_guest_id and removed_at is null;
end;
$$;
