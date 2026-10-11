begin;

create extension if not exists pgtap with schema extensions;

select * from no_plan();

-- =============================================================================
-- Fixtures
--   guests g1 (host), g2, g3
--   A: lobby, pool, 4 seats, community judging. Host seat 1, g2 seat 4.
--   B: lobby, off the dome, 3 seats. Host only.
--   C: lobby, off the dome, 2 seats. Host only (bot added below).
--   D: voting, community. Host, g2 and a bot.
--   E: lobby, 3 seats. Host seat 1, bot seat 2, g3 seat 3.
--   F: lobby, off the dome, 2 seats. Host only (never gets a second player).
--   G: complete, with a vetoed name on record.
-- =============================================================================

insert into public.guest_sessions (id, token_hash, created_at, expires_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'bot-host-token', now(), now() + interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a2', 'bot-g2-token', now(), now() + interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a3', 'bot-g3-token', now(), now() + interval '1 day');

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase, picking_mode
)
values
  ('1a000000-0000-0000-0000-00000000000a', 'BOTAAA', 'A', '00000000-0000-0000-0000-0000000000a1', 4, 1, 'standard', 'community', 'analyst', null, 'LOBBY', 'pool'),
  ('1a000000-0000-0000-0000-00000000000b', 'BOTBBB', 'B', '00000000-0000-0000-0000-0000000000a1', 3, 1, 'standard', 'community', 'analyst', null, 'LOBBY', 'off_the_dome'),
  ('1a000000-0000-0000-0000-00000000000c', 'BOTCCC', 'C', '00000000-0000-0000-0000-0000000000a1', 2, 1, 'standard', 'ai', 'analyst', null, 'LOBBY', 'off_the_dome'),
  ('1a000000-0000-0000-0000-00000000000d', 'BOTDDD', 'D', '00000000-0000-0000-0000-0000000000a1', 3, 1, 'standard', 'community', 'analyst', null, 'VOTING', 'pool'),
  ('1a000000-0000-0000-0000-00000000000e', 'BOTEEE', 'E', '00000000-0000-0000-0000-0000000000a1', 3, 1, 'standard', 'ai', 'analyst', null, 'LOBBY', 'pool'),
  ('1a000000-0000-0000-0000-00000000000f', 'BOTFFF', 'F', '00000000-0000-0000-0000-0000000000a1', 2, 1, 'standard', 'ai', 'analyst', null, 'LOBBY', 'off_the_dome'),
  ('1a000000-0000-0000-0000-000000000010', 'BOTGGG', 'G', '00000000-0000-0000-0000-0000000000a1', 2, 1, 'standard', 'ai', 'analyst', null, 'COMPLETE', 'off_the_dome');

update public.drafts set vetoed_names = '["X"]'::jsonb
where id = '1a000000-0000-0000-0000-000000000010';

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('2a000000-0000-0000-0000-0000000000a1', '1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-0000000000a4', '1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'Two', 4),
  ('2a000000-0000-0000-0000-0000000000b1', '1a000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-0000000000c1', '1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-0000000000d1', '1a000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-0000000000d2', '1a000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a2', 'Two', 2),
  ('2a000000-0000-0000-0000-0000000000e1', '1a000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-0000000000e3', '1a000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000a3', 'Three', 3),
  ('2a000000-0000-0000-0000-0000000000f1', '1a000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000a1', 'Host', 1),
  ('2a000000-0000-0000-0000-000000000101', '1a000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a1', 'Host', 1);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat, is_ready, is_bot, bot_style)
values
  ('2a000000-0000-0000-0000-0000000000d3', '1a000000-0000-0000-0000-00000000000d', null, 'Chalk', 3, true, true, 'chalk'),
  ('2a000000-0000-0000-0000-0000000000e2', '1a000000-0000-0000-0000-00000000000e', null, 'Chalk', 2, true, true, 'chalk');

-- =============================================================================
-- Shape
-- =============================================================================

select has_function('public', 'add_bot_player', 'add_bot_player exists');
select has_function('public', 'remove_bot_player', 'remove_bot_player exists');
select has_function('public', 'commence_off_the_dome', 'commence_off_the_dome exists');
select has_function('public', 'submit_bot_pick', 'submit_bot_pick exists');
select has_column('public', 'draft_players', 'is_bot', 'draft_players.is_bot exists');
select has_column('public', 'draft_players', 'bot_style', 'draft_players.bot_style exists');
select has_column('public', 'drafts', 'vetoed_names', 'drafts.vetoed_names exists');

select throws_ok(
  $$ insert into public.draft_players (draft_id, guest_id, display_name, seat, is_bot, bot_style)
     values ('1a000000-0000-0000-0000-00000000000a', null, 'Ghost', 2, false, null) $$,
  '23514', null, 'a human row needs a guest session'
);

select throws_ok(
  $$ insert into public.draft_players (draft_id, guest_id, display_name, seat, is_bot, bot_style)
     values ('1a000000-0000-0000-0000-00000000000a', null, 'Odd', 2, true, 'genius') $$,
  '23514', null, 'unknown bot styles are refused'
);

select is(
  has_function_privilege('anon', 'public.submit_bot_pick(uuid, integer, uuid, text, boolean)', 'execute'),
  false, 'browsers cannot call submit_bot_pick'
);

-- =============================================================================
-- add_bot_player / remove_bot_player
-- =============================================================================

select throws_like(
  $$ select public.add_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'Chalk', 'chalk') $$,
  '%NOT_HOST%', 'only the host can add an AI drafter'
);

select lives_ok(
  $$ select public.add_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Chalk', 'chalk') $$,
  'host adds an AI drafter'
);

select results_eq(
  $$ select seat::integer, is_bot, is_ready, guest_id is null, bot_style
     from public.draft_players
     where draft_id = '1a000000-0000-0000-0000-00000000000a' and display_name = 'Chalk' $$,
  $$ values (2, true, true, true, 'chalk'::text) $$,
  'the AI drafter takes the lowest empty seat, ready, with no guest'
);

select throws_like(
  $$ select public.add_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'chalk', 'chalk') $$,
  '%NAME_TAKEN%', 'a taken name is refused'
);

select lives_ok(
  $$ select public.add_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Specialist', 'specialist') $$,
  'a second AI drafter fills seat 3'
);

select throws_like(
  $$ select public.add_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Wildcard', 'wildcard') $$,
  '%ROOM_FULL%', 'a full room refuses another AI drafter'
);

select throws_like(
  $$ select public.remove_bot_player('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', '2a000000-0000-0000-0000-0000000000a4') $$,
  '%NOT_A_BOT%', 'a human cannot be removed as an AI drafter'
);

select throws_like(
  $$ select public.remove_bot_player(
       '1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2',
       (select id from public.draft_players where draft_id = '1a000000-0000-0000-0000-00000000000a' and display_name = 'Chalk')) $$,
  '%NOT_HOST%', 'only the host can remove an AI drafter'
);

select lives_ok(
  $$ select public.remove_bot_player(
       '1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1',
       (select id from public.draft_players where draft_id = '1a000000-0000-0000-0000-00000000000a' and display_name = 'Chalk')) $$,
  'host removes the seat 2 AI drafter'
);

-- =============================================================================
-- Leaving the lobby compacts seats (A now has seats 1, 3, 4 filled)
-- =============================================================================

select lives_ok(
  $$ select public.start_pool_review('1a000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1') $$,
  'pool review starts with an empty seat in the middle'
);

select results_eq(
  $$ select display_name, seat::integer from public.draft_players
     where draft_id = '1a000000-0000-0000-0000-00000000000a' and removed_at is null
     order by seat $$,
  $$ values ('Host'::text, 1), ('Specialist'::text, 2), ('Two'::text, 3) $$,
  'seats are renumbered 1..3 in their old order'
);

select results_eq(
  $$ select max_players::integer, phase::text, judging_mode::text from public.drafts
     where id = '1a000000-0000-0000-0000-00000000000a' $$,
  $$ values (3, 'POOL_REVIEW'::text, 'community'::text) $$,
  'the room shrinks to the filled seats; two humans keep community judging'
);

-- =============================================================================
-- commence_off_the_dome
-- =============================================================================

select throws_like(
  $$ select public.commence_off_the_dome('1a000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000a1') $$,
  '%NOT_ENOUGH_PLAYERS%', 'one seat is not a draft'
);

select throws_like(
  $$ select public.commence_off_the_dome('1a000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000a1') $$,
  '%INVALID_INPUT%', 'pool drafts do not commence this way'
);

select public.add_bot_player('1a000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'Chalk', 'chalk');
select public.add_bot_player('1a000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'Specialist', 'specialist');

select lives_ok(
  $$ select public.commence_off_the_dome('1a000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1') $$,
  'a solo off-the-dome draft commences'
);

select results_eq(
  $$ select phase::text, judging_mode::text, max_players::integer from public.drafts
     where id = '1a000000-0000-0000-0000-00000000000b' $$,
  $$ values ('DRAFTING'::text, 'ai'::text, 3) $$,
  'one human forces the AI judge'
);

-- =============================================================================
-- submit_bot_pick (B: order is Chalk seat 2, Specialist seat 3, Host seat 1)
-- =============================================================================

select public.start_draft(
  '1a000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1',
  '[{"overallPick":1,"round":1,"pickInRound":1,"seat":2},
    {"overallPick":2,"round":1,"pickInRound":2,"seat":3},
    {"overallPick":3,"round":1,"pickInRound":3,"seat":1}]'::jsonb
);

select results_eq(
  $$ select o_current_pick_index, o_phase from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000b', 0, null, '  Alpha ') $$,
  $$ values (1, 'DRAFTING'::text) $$,
  'the first AI drafter picks'
);

select is(
  (select item_name from public.picks where draft_id = '1a000000-0000-0000-0000-00000000000b' and overall_pick = 1),
  'Alpha', 'the picked name is trimmed'
);

select throws_like(
  $$ select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000b', 0, null, 'Beta') $$,
  '%STALE_STATE%', 'a second request for the same turn is stale'
);

select throws_like(
  $$ select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000b', 1, null, 'alpha ') $$,
  '%ITEM_UNAVAILABLE%', 'a name that differs only by case and spacing is taken'
);

select lives_ok(
  $$ select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000b', 1, null, null, true) $$,
  'an AI drafter can forfeit'
);

select is(
  (select forfeited from public.picks where draft_id = '1a000000-0000-0000-0000-00000000000b' and overall_pick = 2),
  true, 'the forfeit is recorded'
);

select throws_like(
  $$ select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000b', 2, null, 'Gamma') $$,
  '%NOT_BOT_TURN%', 'the server cannot pick for a human seat'
);

select is(
  (select count(*)::integer from public.picks where draft_id = '1a000000-0000-0000-0000-00000000000b'),
  2, 'refused requests left no extra picks'
);

-- =============================================================================
-- Veto, defense (C: Chalk seat 2 picks first, then Host)
-- =============================================================================

select public.add_bot_player('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', 'Chalk', 'chalk');
select public.commence_off_the_dome('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1');
select public.start_draft(
  '1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1',
  '[{"overallPick":1,"round":1,"pickInRound":1,"seat":2},
    {"overallPick":2,"round":1,"pickInRound":2,"seat":1}]'::jsonb
);

select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000c', 0, null, 'Bad Pick');

select lives_ok(
  $$ select * from public.initiate_veto('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1') $$,
  'the one human can challenge an AI pick'
);

select results_eq(
  $$ select o_phase, o_vetoed from public.submit_veto_vote('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', true) $$,
  $$ values ('DRAFTING'::text, true) $$,
  'the human vote alone decides the challenge'
);

select results_eq(
  $$ select vetoed_names, current_pick_index from public.drafts where id = '1a000000-0000-0000-0000-00000000000c' $$,
  $$ values ('["Bad Pick"]'::jsonb, 0) $$,
  'the vetoed name is remembered and the AI drafter is back on the clock'
);

select * from public.submit_bot_pick('1a000000-0000-0000-0000-00000000000c', 0, null, 'Good Pick');
select * from public.submit_pick(
  '1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', null, 1, 'Mine'
);

select is(
  (select phase::text from public.drafts where id = '1a000000-0000-0000-0000-00000000000c'),
  'DRAFT_COMPLETE', 'the last pick ends drafting'
);

select lives_ok(
  $$ select public.start_defense('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1') $$,
  'defense starts'
);

select results_eq(
  $$ select dp.display_name, a.skipped from public.arguments a
     join public.draft_players dp on dp.id = a.player_id
     where a.draft_id = '1a000000-0000-0000-0000-00000000000c' $$,
  $$ values ('Chalk'::text, true) $$,
  'the AI drafter has a skipped defense'
);

select public.submit_defense('1a000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000a1', 'Because.', false);

select is(
  (select phase::text from public.drafts where id = '1a000000-0000-0000-0000-00000000000c'),
  'JUDGING', 'defense ends once the human has answered'
);

-- =============================================================================
-- Voting (D)
-- =============================================================================

select public.submit_vote('1a000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a1', '2a000000-0000-0000-0000-0000000000d3');

select is(
  (select phase::text from public.drafts where id = '1a000000-0000-0000-0000-00000000000d'),
  'VOTING', 'voting waits for the second human'
);

select public.submit_vote('1a000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000a2', '2a000000-0000-0000-0000-0000000000d1');

select is(
  (select phase::text from public.drafts where id = '1a000000-0000-0000-0000-00000000000d'),
  'JUDGING', 'voting ends when every human has voted'
);

-- =============================================================================
-- leave_draft, rematch
-- =============================================================================

select public.leave_draft('1a000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000a1');

select is(
  (select host_guest_id from public.drafts where id = '1a000000-0000-0000-0000-00000000000e'),
  '00000000-0000-0000-0000-0000000000a3'::uuid,
  'hosting skips the AI drafter in seat 2'
);

select public.reset_draft_for_rematch('1a000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a1');

select is(
  (select vetoed_names from public.drafts where id = '1a000000-0000-0000-0000-000000000010'),
  '[]'::jsonb, 'a rematch forgets vetoed names'
);

select * from finish();

rollback;
