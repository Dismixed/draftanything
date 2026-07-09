-- Slippery Slope multiplayer rooms

create type public.ss_room_phase as enum ('LOBBY', 'PLAYING', 'WIN');
create type public.ss_turn_phase as enum ('WAGER', 'QUESTION');

create table public.ss_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_guest_id uuid not null references public.guest_sessions(id),
  category text not null default 'general',
  max_players integer not null check (max_players >= 2 and max_players <= 6),
  phase public.ss_room_phase not null default 'LOBBY',
  turn_phase public.ss_turn_phase,
  current_seat integer,
  current_wager integer check (current_wager is null or (current_wager >= 1 and current_wager <= 10)),
  current_question jsonb,
  sl_map jsonb,
  question_pool jsonb not null default '[]'::jsonb,
  used_question_indices jsonb not null default '[]'::jsonb,
  question_token text not null default '',
  seen_question_ids jsonb not null default '[]'::jsonb,
  winner_player_id uuid,
  last_event jsonb,
  turn_deadline timestamptz,
  turn_seq integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.ss_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ss_rooms(id) on delete cascade,
  guest_id uuid not null references public.guest_sessions(id),
  display_name text not null,
  seat integer not null check (seat >= 1 and seat <= 6),
  color_index integer not null default 0 check (color_index >= 0 and color_index <= 5),
  position integer not null default 0 check (position >= 0 and position <= 50),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (room_id, guest_id),
  unique (room_id, seat)
);

create index ss_players_room_id_idx on public.ss_players (room_id);
create index ss_rooms_room_code_idx on public.ss_rooms (room_code);

alter table public.ss_rooms enable row level security;
alter table public.ss_players enable row level security;

revoke all on table public.ss_rooms, public.ss_players from anon, authenticated;

grant select (
  id, room_code, category, max_players, phase, turn_phase, current_seat,
  current_wager, current_question, sl_map, winner_player_id, last_event,
  turn_deadline, turn_seq, created_at, started_at, completed_at
) on public.ss_rooms to anon, authenticated;

grant select (
  id, room_id, display_name, seat, color_index, position, joined_at, removed_at
) on public.ss_players to anon, authenticated;

create policy "Browser roles can read ss rooms"
  on public.ss_rooms for select to anon, authenticated using (true);

create policy "Browser roles can read ss players"
  on public.ss_players for select to anon, authenticated using (true);

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ss_rooms'
  ) then
    alter publication supabase_realtime add table public.ss_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ss_players'
  ) then
    alter publication supabase_realtime add table public.ss_players;
  end if;
end
$$;

-- ── create_ss_room ──────────────────────────────────────────────

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

      insert into public.ss_players (room_id, guest_id, display_name, seat, color_index)
      values (v_room_id, p_host_guest_id, p_display_name, 1, 0)
      returning id into v_player_id;

      return query select v_room_id, v_room_code, v_player_id;
      return;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

-- ── join_ss_room ──────────────────────────────────────────────────

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

  insert into public.ss_players (room_id, guest_id, display_name, seat, color_index)
  values (p_room_id, p_guest_id, p_display_name, v_seat, v_seat - 1)
  returning id into v_player_id;

  return query select v_player_id, v_seat, p_room_id;
end;
$$;

-- ── leave_ss_room ─────────────────────────────────────────────────

create or replace function public.leave_ss_room(
  p_room_id uuid,
  p_guest_id uuid
) returns void
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
begin
  select * into v_room from public.ss_rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_room.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  update public.ss_players
  set removed_at = now()
  where room_id = p_room_id and guest_id = p_guest_id and removed_at is null;
end;
$$;

-- ── start_ss_game ─────────────────────────────────────────────────

create or replace function public.start_ss_game(
  p_room_id uuid,
  p_host_guest_id uuid,
  p_sl_map jsonb,
  p_question_pool jsonb,
  p_question_token text,
  p_seen_question_ids jsonb
) returns void
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
  v_first_seat integer;
  v_count integer;
begin
  select * into v_room from public.ss_rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_room.host_guest_id != p_host_guest_id then
    raise exception 'NOT_HOST' using errcode = 'P0001';
  end if;
  if v_room.phase != 'LOBBY' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select count(*) into v_count
  from public.ss_players where room_id = p_room_id and removed_at is null;
  if v_count < 2 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  select min(seat) into v_first_seat
  from public.ss_players where room_id = p_room_id and removed_at is null;

  update public.ss_players set position = 0
  where room_id = p_room_id and removed_at is null;

  update public.ss_rooms set
    phase = 'PLAYING',
    turn_phase = 'WAGER',
    current_seat = v_first_seat,
    current_wager = null,
    current_question = null,
    sl_map = p_sl_map,
    question_pool = p_question_pool,
    used_question_indices = '[]'::jsonb,
    question_token = coalesce(p_question_token, ''),
    seen_question_ids = coalesce(p_seen_question_ids, '[]'::jsonb),
    winner_player_id = null,
    last_event = null,
    turn_deadline = null,
    turn_seq = 0,
    started_at = now(),
    completed_at = null
  where id = p_room_id;
end;
$$;

-- ── submit_ss_wager ───────────────────────────────────────────────

create or replace function public.submit_ss_wager(
  p_room_id uuid,
  p_guest_id uuid,
  p_wager integer,
  p_turn_seq integer,
  p_question jsonb,
  p_question_index integer
) returns void
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
  v_player public.ss_players%rowtype;
begin
  if p_wager < 1 or p_wager > 10 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  select * into v_room from public.ss_rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_room.phase != 'PLAYING' or v_room.turn_phase != 'WAGER' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;
  if v_room.turn_seq != p_turn_seq then
    raise exception 'STALE_STATE' using errcode = 'P0001';
  end if;

  select * into v_player from public.ss_players
  where room_id = p_room_id and guest_id = p_guest_id and removed_at is null;
  if not found then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  if v_player.seat != v_room.current_seat then
    raise exception 'STALE_STATE' using errcode = 'P0001';
  end if;

  update public.ss_rooms set
    current_wager = p_wager,
    current_question = p_question,
    turn_phase = 'QUESTION',
    turn_deadline = now() + interval '30 seconds',
    used_question_indices = coalesce(used_question_indices, '[]'::jsonb) || to_jsonb(p_question_index),
    last_event = null
  where id = p_room_id;
end;
$$;

-- ── submit_ss_answer ──────────────────────────────────────────────

create or replace function public.submit_ss_answer(
  p_room_id uuid,
  p_guest_id uuid,
  p_answer_index integer,
  p_turn_seq integer,
  p_timed_out boolean default false
) returns void
language plpgsql security definer as $$
declare
  v_room public.ss_rooms%rowtype;
  v_player public.ss_players%rowtype;
  v_correct integer;
  v_wager integer;
  v_from integer;
  v_to integer;
  v_final integer;
  v_sl_key text;
  v_sl_dest integer;
  v_outcome text;
  v_next_seat integer;
  v_event jsonb;
begin
  select * into v_room from public.ss_rooms where id = p_room_id for update;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_room.phase != 'PLAYING' or v_room.turn_phase != 'QUESTION' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;
  if v_room.turn_seq != p_turn_seq then
    raise exception 'STALE_STATE' using errcode = 'P0001';
  end if;

  select * into v_player from public.ss_players
  where room_id = p_room_id and guest_id = p_guest_id and removed_at is null;
  if not found then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;
  if v_player.seat != v_room.current_seat then
    raise exception 'STALE_STATE' using errcode = 'P0001';
  end if;

  v_correct := (v_room.current_question->>'c')::integer;
  v_wager := v_room.current_wager;
  v_from := v_player.position;

  if p_timed_out or p_answer_index is distinct from v_correct then
    v_to := greatest(v_from - (v_wager / 2), 0);
    v_outcome := case when p_timed_out then 'timeout' else 'wrong' end;
  else
    v_to := least(v_from + v_wager, 50);
    v_outcome := 'correct';
  end if;

  v_final := v_to;
  v_sl_dest := null;
  v_sl_key := v_to::text;
  if v_room.sl_map ? v_sl_key then
    v_sl_dest := (v_room.sl_map->>v_sl_key)::integer;
    v_final := v_sl_dest;
  end if;

  update public.ss_players set position = v_final where id = v_player.id;

  v_event := jsonb_build_object(
    'type', 'turn_result',
    'playerId', v_player.id,
    'playerName', v_player.display_name,
    'outcome', v_outcome,
    'from', v_from,
    'to', v_to,
    'final', v_final,
    'wager', v_wager,
    'correctIndex', v_correct,
    'answerIndex', p_answer_index,
    'slDest', v_sl_dest
  );

  if v_final >= 50 then
    update public.ss_rooms set
      phase = 'WIN',
      turn_phase = null,
      current_seat = null,
      current_wager = null,
      current_question = null,
      winner_player_id = v_player.id,
      last_event = v_event,
      turn_deadline = null,
      turn_seq = turn_seq + 1,
      completed_at = now()
    where id = p_room_id;
    return;
  end if;

  select s.seat into v_next_seat
  from public.ss_players s
  where s.room_id = p_room_id
    and s.removed_at is null
    and s.seat > v_room.current_seat
  order by s.seat
  limit 1;

  if v_next_seat is null then
    select min(s.seat) into v_next_seat
    from public.ss_players s
    where s.room_id = p_room_id and s.removed_at is null;
  end if;

  update public.ss_rooms set
    phase = 'PLAYING',
    turn_phase = 'WAGER',
    current_seat = v_next_seat,
    current_wager = null,
    current_question = null,
    last_event = v_event,
    turn_deadline = null,
    turn_seq = turn_seq + 1
  where id = p_room_id;
end;
$$;
