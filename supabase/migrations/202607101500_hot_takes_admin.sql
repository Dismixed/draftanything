-- Hot Takes category authoring, item images, and daily schedule.

create table public.hot_takes_categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  status          text not null default 'draft'
    check (status in ('draft', 'needs_items', 'needs_review', 'approved', 'rejected', 'used')),
  cover_image_url text,
  notes           text,
  proposed_by     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index hot_takes_categories_status_idx
  on public.hot_takes_categories (status);

create table public.hot_takes_items (
  id                       uuid primary key default gen_random_uuid(),
  category_id              uuid not null references public.hot_takes_categories(id) on delete cascade,
  slug                     text not null,
  label                    text not null,
  sort_order               int not null default 0,
  wiki_title               text,
  image_url                text,
  image_candidates         jsonb not null default '[]'::jsonb,
  selected_candidate_index int not null default 0,
  image_source             text
    check (image_source is null or image_source in ('wikimedia', 'manual', 'generated')),
  status                   text not null default 'draft'
    check (status in ('draft', 'needs_image', 'needs_review', 'approved', 'rejected')),
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint hot_takes_items_category_slug_unique unique (category_id, slug),
  constraint hot_takes_items_candidates_array check (jsonb_typeof(image_candidates) = 'array')
);

create index hot_takes_items_category_sort_idx
  on public.hot_takes_items (category_id, sort_order);

create index hot_takes_items_status_idx
  on public.hot_takes_items (status);

create table public.hot_takes_schedule (
  id            uuid primary key default gen_random_uuid(),
  publish_date  date not null unique,
  category_id   uuid not null references public.hot_takes_categories(id) on delete restrict,
  created_at    timestamptz not null default now()
);

create index hot_takes_schedule_category_idx
  on public.hot_takes_schedule (category_id);

alter table public.hot_takes_categories enable row level security;
alter table public.hot_takes_items enable row level security;
alter table public.hot_takes_schedule enable row level security;

revoke all on table public.hot_takes_categories from anon, authenticated;
revoke all on table public.hot_takes_items from anon, authenticated;
revoke all on table public.hot_takes_schedule from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hot-takes-icons',
  'hot-takes-icons',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "Public read hot takes icons"
  on storage.objects for select
  using (bucket_id = 'hot-takes-icons');
