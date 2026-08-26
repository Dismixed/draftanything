alter table public.hot_takes_items
  add column subject_type text not null default 'generic'
    check (subject_type in ('real_entity', 'generic'));

alter table public.hot_takes_items
  add column photo_query text;
