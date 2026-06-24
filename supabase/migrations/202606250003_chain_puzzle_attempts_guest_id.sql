-- Add guest_id to chain_puzzle_attempts alongside user_id
-- Enables guest players to track puzzle attempts

alter table public.chain_puzzle_attempts
  add column guest_id uuid references public.guest_sessions(id) on delete set null;

alter table public.chain_puzzle_attempts
  add constraint chain_puzzle_attempts_identity_check
    check (num_nonnulls(guest_id, user_id) >= 1);

create index chain_puzzle_attempts_guest_idx
  on public.chain_puzzle_attempts (guest_id, mode);
