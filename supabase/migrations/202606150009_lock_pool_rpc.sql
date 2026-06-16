create or replace function public.lock_pool(
  p_draft_id uuid,
  p_guest_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_draft drafts%rowtype;
  v_item_count integer;
  v_min_items integer;
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

  if v_draft.phase != 'POOL_REVIEW' then
    raise exception 'INVALID_PHASE' using errcode = 'P0001';
  end if;

  select count(*) into v_item_count
  from public.draft_items
  where draft_id = p_draft_id;

  v_min_items := v_draft.max_players * v_draft.rounds;

  if v_item_count < v_min_items then
    raise exception 'INSUFFICIENT_ITEMS: need at least % items, got %', v_min_items, v_item_count using errcode = 'P0001';
  end if;

  update public.drafts
  set phase = 'DRAFTING'
  where id = p_draft_id;
end;
$$;
