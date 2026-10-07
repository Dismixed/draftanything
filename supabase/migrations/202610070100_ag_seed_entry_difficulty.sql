-- How hard each AnyGuessr clue is to place. The daily lineup uses it to keep
-- every day on the same difficulty curve.

alter table public.ag_seed_entries
  add column difficulty text
    check (difficulty in ('easy', 'medium', 'hard'));
