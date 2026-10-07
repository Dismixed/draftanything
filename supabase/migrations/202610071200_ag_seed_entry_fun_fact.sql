-- A fact about each AnyGuessr clue, shown after the player guesses. It is about the
-- thing in the clue (the landmark, the dish, the animal), not the country in general.
-- A fact reaches players only once a person has marked it reviewed.

alter table public.ag_seed_entries
  add column fun_fact text
    check (fun_fact is null or char_length(fun_fact) <= 280),
  add column fun_fact_reviewed boolean not null default false;
