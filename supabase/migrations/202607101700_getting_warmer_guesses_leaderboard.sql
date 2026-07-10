-- Leaderboard stores guess count (fewer is better), not points

alter table public.getting_warmer_leaderboard
  drop constraint if exists getting_warmer_leaderboard_score_range;

alter table public.getting_warmer_leaderboard
  add constraint getting_warmer_leaderboard_score_range
    check (score >= 1 and score <= 500);
