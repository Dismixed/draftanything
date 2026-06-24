-- RPC to link a guest session to an authenticated user account

create or replace function public.link_guest_to_account(
  p_token_hash text,
  p_user_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update public.guest_sessions
  set user_id = p_user_id
  where token_hash = p_token_hash
    and user_id is null;
end;
$$;
