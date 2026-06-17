create or replace function public.get_active_guest_session_id(
  p_token_hash text
) returns uuid
language sql
security definer
stable
as $$
  select id
  from public.guest_sessions
  where token_hash = p_token_hash
    and expires_at > now();
$$;

create or replace function public.ensure_guest_session(
  p_token_hash text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_expires timestamptz;
begin
  select id, expires_at
  into v_id, v_expires
  from public.guest_sessions
  where token_hash = p_token_hash;

  if found then
    if v_expires > now() then
      return v_id;
    end if;
    raise exception 'GUEST_SESSION_EXPIRED' using errcode = 'P0001';
  end if;

  insert into public.guest_sessions (token_hash, expires_at)
  values (p_token_hash, now() + interval '30 days')
  returning id into v_id;

  return v_id;
end;
$$;
