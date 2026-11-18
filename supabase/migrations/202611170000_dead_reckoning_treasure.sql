-- Dead Reckoning's treasure island: a voyage that reaches the last island under par
-- answers one more question, which can take up to two days off. So a voyage can now
-- take as few as 5 days, and its guesses can have an eighth entry, the treasure guess.

alter table public.dead_reckoning_plays
  drop constraint dead_reckoning_plays_days_range,
  add constraint dead_reckoning_plays_days_range
    check (days >= 5 and days <= 35),
  drop constraint dead_reckoning_plays_guesses_shape,
  add constraint dead_reckoning_plays_guesses_shape
    check (jsonb_typeof(guesses) = 'array' and jsonb_array_length(guesses) in (7, 8));
