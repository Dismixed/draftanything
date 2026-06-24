-- Profiles table (1:1 with auth.users)
-- Auto-create profile on user sign-up via trigger

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_nonempty
    check (char_length(btrim(display_name)) between 1 and 40)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_avatar_url text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1),
    'Player'
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'picture',
    'https://www.gravatar.com/avatar/' || encode(extensions.digest(lower(trim(new.email)), 'md5'), 'hex') || '?d=mp&s=200'
  );
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_display_name, v_avatar_url);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;

grant select (id, display_name, avatar_url, created_at)
  on public.profiles to anon, authenticated;

create policy "Browser roles can read profiles"
  on public.profiles for select to anon, authenticated using (true);
