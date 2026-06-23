begin;

create extension if not exists pgtap with schema extensions;

select plan(58);

-- =============================================================================
-- Fixture setup
-- =============================================================================

insert into public.guest_sessions (id, token_hash, created_at, expires_at)
values
  ('00000000-0000-0000-0000-000000000001', 'host-token', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000002', 'guest2-token', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000003', 'guest3-token', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00');

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000001',
  'JUDGE01',
  'Judge Test Draft',
  '00000000-0000-0000-0000-000000000001',
  3, 2,
  'snake', 'hybrid', 'analyst',
  null, 'DEFENSE'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Host', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Player2', 2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Player3', 3);

-- =============================================================================
-- Test RPC existence
-- =============================================================================

select has_function('public', 'submit_defense', 'submit_defense exists');
select has_function('public', 'advance_phase', 'advance_phase exists');
select has_function('public', 'submit_vote', 'submit_vote exists');
select has_function('public', 'maybe_advance_from_defense', 'maybe_advance_from_defense exists');
select has_function('public', 'maybe_advance_from_voting', 'maybe_advance_from_voting exists');

-- =============================================================================
-- submit_defense tests
-- =============================================================================

-- Valid defense submission
select lives_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'My picks are strategically sound.',
      false
    );
  $$,
  'valid defense submission succeeds'
);

select is(
  (select count(*)::integer from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'one defense argument recorded'
);

select is(
  (select skipped from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001' and player_id = '20000000-0000-0000-0000-000000000001'),
  false,
  'defense is not skipped'
);

-- Second defense from same player is idempotent (upsert)
select lives_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'Updated defense text.',
      false
    );
  $$,
  'second defense from same player updates existing (upsert)'
);

select is(
  (select defense_text from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001' and player_id = '20000000-0000-0000-0000-000000000001'),
  'Updated defense text.',
  'defense text was upserted'
);

select is(
  (select count(*)::integer from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'still one defense argument after upsert'
);

-- Explicit skip
select lives_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      null,
      true
    );
  $$,
  'explicit skip succeeds'
);

select is(
  (select skipped from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001' and player_id = '20000000-0000-0000-0000-000000000002'),
  true,
  'second player skipped defense'
);

-- Non-player cannot submit defense
select throws_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000004',
      'test',
      false
    );
  $$,
  'P0001',
  'NOT_A_PLAYER',
  'non-player cannot submit defense'
);

-- Wrong phase fails
update public.drafts set phase = 'DRAFTING' where id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      'test',
      false
    );
  $$,
  'P0001',
  'INVALID_PHASE',
  'submit_defense fails when not in DEFENSE phase'
);

-- Reset phase back to DEFENSE
update public.drafts set phase = 'DEFENSE' where id = '10000000-0000-0000-0000-000000000001';

-- =============================================================================
-- advance_phase tests (DEFENSE → VOTING for non-ai mode)
-- =============================================================================

-- Non-host cannot advance
select throws_ok(
  $$
    select public.advance_phase(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    );
  $$,
  'P0001',
  'NOT_HOST',
  'non-host cannot advance phase'
);

-- Host advances from DEFENSE to VOTING (hybrid mode, before all players respond)
select results_eq(
  $$
    select o_phase from public.advance_phase(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  $$ values ('VOTING') $$,
  'DEFENSE → VOTING for hybrid mode'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'VOTING',
  'phase is now VOTING'
);

-- =============================================================================
-- submit_defense auto-advance when all players respond
-- =============================================================================

update public.drafts set phase = 'DEFENSE' where id = '10000000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    select public.submit_defense(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      null,
      true
    );
  $$,
  'third player skip succeeds'
);

select is(
  (select count(*)::integer from public.arguments where draft_id = '10000000-0000-0000-0000-000000000001'),
  3,
  'all three players submitted defense or skipped'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'VOTING',
  'auto-advances to VOTING when every player has responded'
);

-- =============================================================================
-- submit_vote tests
-- =============================================================================

-- Valid vote
select lives_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002'
    );
  $$,
  'valid vote succeeds'
);

select is(
  (select count(*)::integer from public.votes where draft_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'one vote recorded'
);

select is(
  (select selected_player_id from public.votes where draft_id = '10000000-0000-0000-0000-000000000001' and voter_player_id = '20000000-0000-0000-0000-000000000001'),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'host voted for Player2'
);

-- One vote per voter — upsert (idempotent)
select lives_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000003'
    );
  $$,
  'second vote from same voter updates (upsert)'
);

select is(
  (select count(*)::integer from public.votes where draft_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'still one vote after upsert'
);

select is(
  (select selected_player_id from public.votes where draft_id = '10000000-0000-0000-0000-000000000001' and voter_player_id = '20000000-0000-0000-0000-000000000001'),
  '20000000-0000-0000-0000-000000000003'::uuid,
  'vote changed to Player3 after upsert'
);

-- No self-vote
select throws_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000002'
    );
  $$,
  'P0001',
  'SELF_VOTE',
  'self-vote is rejected'
);

-- Player-only voting (non-player cannot vote)
select throws_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000001'
    );
  $$,
  'P0001',
  'NOT_A_PLAYER',
  'non-player cannot vote'
);

-- Submit remaining votes (Player2 votes for Player3, Player3 votes for Player2)
select lives_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000003'
    );
  $$,
  'Player2 votes for Player3'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'VOTING',
  'still VOTING after two of three votes'
);

select lives_ok(
  $$
    select public.submit_vote(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000001'
    );
  $$,
  'Player3 votes for Host'
);

select is(
  (select count(*)::integer from public.votes where draft_id = '10000000-0000-0000-0000-000000000001'),
  3,
  'all three votes recorded'
);

-- =============================================================================
-- submit_vote auto-advance when all players voted
-- =============================================================================

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'JUDGING',
  'auto-advances to JUDGING when every player has voted'
);

-- =============================================================================
-- advance_phase tests (JUDGING → COMPLETE)
-- =============================================================================

-- Cannot advance without a judgment
select throws_ok(
  $$
    select public.advance_phase(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'P0001',
  'NO_JUDGMENT',
  'cannot advance JUDGING without judgment'
);

-- Insert a judgment
insert into public.judgments (
  draft_id, source, player_scores, ranking, winner_player_ids,
  awards, explanation, model, prompt_version, idempotency_key
) values (
  '10000000-0000-0000-0000-000000000001',
  'fallback',
  '{"20000000-0000-0000-0000-000000000001": 8, "20000000-0000-0000-0000-000000000002": 6, "20000000-0000-0000-0000-000000000003": 7}'::jsonb,
  '["20000000-0000-0000-0000-000000000001", "20000000-0000-0000-0000-000000000003", "20000000-0000-0000-0000-000000000002"]'::jsonb,
  '["20000000-0000-0000-0000-000000000001"]'::jsonb,
  '{}'::jsonb,
  'Fallback judgment.',
  null,
  '1.0.0',
  'test-idempotency-key-001'
);

-- Idempotent judgment insert (unique constraint on idempotency_key)
select throws_ok(
  $$
    insert into public.judgments (
      draft_id, source, player_scores, ranking, winner_player_ids,
      awards, explanation, model, prompt_version, idempotency_key
    ) values (
      '10000000-0000-0000-0000-000000000001',
      'fallback',
      '{"20000000-0000-0000-0000-000000000001": 9}'::jsonb,
      '["20000000-0000-0000-0000-000000000001"]'::jsonb,
      '["20000000-0000-0000-0000-000000000001"]'::jsonb,
      '{}'::jsonb,
      'Duplicate.',
      null,
      '1.0.0',
      'test-idempotency-key-001'
    );
  $$,
  '23505',
  NULL,
  'duplicate idempotency_key is rejected (unique constraint)'
);

-- Now advance JUDGING → COMPLETE
select results_eq(
  $$
    select o_phase from public.advance_phase(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  $$ values ('COMPLETE') $$,
  'JUDGING → COMPLETE with judgment present'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'COMPLETE',
  'phase is now COMPLETE'
);

select ok(
  (select completed_at is not null from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'completed_at is set'
);

-- =============================================================================
-- advance_phase: AI mode (DEFENSE → JUDGING)
-- =============================================================================

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000002',
  'JUDGE02',
  'AI Judge Mode',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'ai', 'analyst',
  null, 'DEFENSE'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'AIHost', 1),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'AIPlayer2', 2);

-- In AI mode, DEFENSE → JUDGING
select results_eq(
  $$
    select o_phase from public.advance_phase(
      '10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  $$ values ('JUDGING') $$,
  'AI mode: DEFENSE → JUDGING directly'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000002'),
  'JUDGING',
  'AI mode phase is JUDGING'
);

-- =============================================================================
-- advance_phase: Community mode (VOTES_INCOMPLETE check)
-- =============================================================================

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000003',
  'JUDGE03',
  'Community Mode',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'community', 'analyst',
  null, 'DEFENSE'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'CommHost', 1),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'CommPlayer2', 2);

-- Advance DEFENSE → VOTING
select lives_ok(
  $$
    select public.advance_phase(
      '10000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'community mode: advance to VOTING'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000003'),
  'VOTING',
  'community mode phase is VOTING'
);

-- Try to advance VOTING → JUDGING without any votes (should fail for community mode)
select throws_ok(
  $$
    select public.advance_phase(
      '10000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'P0001',
  'VOTES_INCOMPLETE',
  'community mode: cannot advance VOTING without all votes'
);

-- =============================================================================
-- maybe_advance_from_defense repair tests
-- =============================================================================

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000004',
  'JUDGE04',
  'Stuck Defense Repair',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'hybrid', 'analyst',
  null, 'DEFENSE'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'RepairHost', 1),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'RepairGuest', 2);

insert into public.arguments (draft_id, player_id, defense_text, skipped)
values
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008', null, true),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', null, true);

select is(
  public.maybe_advance_from_defense('10000000-0000-0000-0000-000000000004'),
  true,
  'repair advances stuck hybrid draft when all defenses are in'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000004'),
  'VOTING',
  'repaired draft phase is VOTING'
);

select is(
  public.maybe_advance_from_defense('10000000-0000-0000-0000-000000000004'),
  false,
  'repair is idempotent after phase already advanced'
);

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000005',
  'JUDGE05',
  'Stuck AI Defense Repair',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'ai', 'analyst',
  null, 'DEFENSE'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'AIRepairHost', 1),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'AIRepairGuest', 2);

insert into public.arguments (draft_id, player_id, defense_text, skipped)
values
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000010', null, true),
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000011', null, true);

select is(
  public.maybe_advance_from_defense('10000000-0000-0000-0000-000000000005'),
  true,
  'repair advances stuck AI draft when all defenses are in'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000005'),
  'JUDGING',
  'repaired AI draft phase is JUDGING'
);

select is(
  public.maybe_advance_from_defense('10000000-0000-0000-0000-000000000003'),
  false,
  'repair no-ops when draft is not in DEFENSE'
);

-- =============================================================================
-- maybe_advance_from_voting repair tests
-- =============================================================================

insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase
)
values (
  '10000000-0000-0000-0000-000000000006',
  'JUDGE06',
  'Stuck Voting Repair',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'hybrid', 'analyst',
  null, 'VOTING'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'VoteRepairHost', 1),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'VoteRepairGuest', 2);

insert into public.votes (draft_id, voter_player_id, selected_player_id)
values
  ('10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000013'),
  ('10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000012');

select is(
  public.maybe_advance_from_voting('10000000-0000-0000-0000-000000000006'),
  true,
  'repair advances stuck hybrid draft when all votes are in'
);

select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000006'),
  'JUDGING',
  'repaired voting draft phase is JUDGING'
);

select is(
  public.maybe_advance_from_voting('10000000-0000-0000-0000-000000000006'),
  false,
  'voting repair is idempotent after phase already advanced'
);

select * from finish();
rollback;
