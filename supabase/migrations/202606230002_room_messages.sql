create table public.room_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  player_id uuid not null references public.draft_players(id),
  text text not null,
  created_at timestamptz not null default now(),
  constraint room_messages_text_nonempty
    check (char_length(btrim(text)) between 1 and 500)
);

create index room_messages_draft_created_idx
  on public.room_messages (draft_id, created_at desc);

create or replace function public.send_room_message(
  p_draft_id uuid,
  p_guest_id uuid,
  p_text text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_player_id uuid;
  v_message_id uuid;
  v_trimmed text;
begin
  v_trimmed := btrim(p_text);

  if char_length(v_trimmed) < 1 or char_length(v_trimmed) > 500 then
    raise exception 'INVALID_INPUT: message must be 1-500 characters' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.drafts where id = p_draft_id
  ) then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  select id into v_player_id
  from public.draft_players
  where draft_id = p_draft_id
    and guest_id = p_guest_id
    and removed_at is null;

  if not found then
    raise exception 'NOT_A_PLAYER' using errcode = 'P0001';
  end if;

  insert into public.room_messages (draft_id, player_id, text)
  values (p_draft_id, v_player_id, v_trimmed)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

alter table public.room_messages enable row level security;

revoke all on table public.room_messages from anon, authenticated;

grant select (
  id, draft_id, player_id, text, created_at
) on public.room_messages to anon, authenticated;

create policy "Browser roles can read room messages"
  on public.room_messages for select to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;
end
$$;
