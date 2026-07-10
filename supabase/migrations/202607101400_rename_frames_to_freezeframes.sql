-- Rename Frames tables to FreezeFrames (game was renamed; migration 202607091200
-- already ran under the old frames_* names).

alter table public.frames_puzzles rename to freezeframes_puzzles;
alter table public.daily_frames_puzzles rename to daily_freezeframes_puzzles;
alter table public.frames_leaderboard rename to freezeframes_leaderboard;
alter table public.frames_seed_entries rename to freezeframes_seed_entries;

drop policy if exists "Browser roles can read frames leaderboard"
  on public.freezeframes_leaderboard;

create policy "Browser roles can read freezeframes leaderboard"
  on public.freezeframes_leaderboard for select to anon, authenticated using (true);

-- Update seeded asset paths from /frames/ to /freezeframes/
update public.freezeframes_puzzles
set
  movie = jsonb_set(movie, '{img}', to_jsonb(replace(movie->>'img', '/frames/', '/freezeframes/'))),
  show = jsonb_set(show, '{img}', to_jsonb(replace(show->>'img', '/frames/', '/freezeframes/'))),
  album = jsonb_set(album, '{img}', to_jsonb(replace(album->>'img', '/frames/', '/freezeframes/')))
where movie->>'img' like '/frames/%'
   or show->>'img' like '/frames/%'
   or album->>'img' like '/frames/%';
