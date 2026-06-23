-- reset_draft_for_rematch set pick_order/rubric to NULL, but both columns are NOT NULL.

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
    judging_started_at = null
  where id = p_draft_id;
end;
$$;
