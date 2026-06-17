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
  v_active_player_count integer;
  v_defense_count integer;
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

  select count(*) into v_active_player_count
  from public.draft_players
  where draft_id = p_draft_id
    and removed_at is null;

  select count(*) into v_defense_count
  from public.arguments
  where draft_id = p_draft_id;

  if v_defense_count >= v_active_player_count then
    if v_draft.judging_mode::text = 'ai' then
      update public.drafts
      set phase = 'JUDGING'
      where id = p_draft_id;
    else
      update public.drafts
      set phase = 'VOTING'
      where id = p_draft_id;
    end if;
  end if;
end;
$$;
