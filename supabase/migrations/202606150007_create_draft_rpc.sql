create or replace function public.create_draft(
  p_host_guest_id uuid,
  p_display_name text,
  p_topic text,
  p_max_players integer,
  p_rounds integer,
  p_draft_type text,
  p_judging_mode text,
  p_ai_personality text,
  p_timer_seconds integer
) returns table (draft_id uuid, room_code text, player_id uuid)
language plpgsql security definer as $$
declare
  v_room_code text;
  v_draft_id uuid;
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

    -- Generate a 6-character code from the ambiguity-free alphabet using pgcrypto
    v_rand_bytes := extensions.gen_random_bytes(v_code_len);
    v_room_code := '';
    for i in 0 .. v_code_len - 1 loop
      v_room_code := v_room_code ||
        substr(v_alphabet, (get_byte(v_rand_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;

    begin
      insert into public.drafts (
        room_code, host_guest_id, topic, max_players, rounds,
        draft_type, judging_mode, ai_personality,
        timer_seconds, phase, current_pick_index, pick_order, rubric
      ) values (
        v_room_code,
        p_host_guest_id,
        p_topic,
        p_max_players,
        p_rounds,
        p_draft_type::public.draft_type,
        p_judging_mode::public.judging_mode,
        p_ai_personality::public.ai_personality,
        p_timer_seconds,
        'LOBBY',
        0,
        '[]'::jsonb,
        '{}'::jsonb
      ) returning id into v_draft_id;

      -- Insert host player at seat 1
      insert into public.draft_players (draft_id, guest_id, display_name, seat)
      values (v_draft_id, p_host_guest_id, p_display_name, 1)
      returning id into v_player_id;

      return query select v_draft_id, v_room_code, v_player_id;
      return;
    exception when unique_violation then
      -- Room code collision — retry
      continue;
    end;
  end loop;
end;
$$;
