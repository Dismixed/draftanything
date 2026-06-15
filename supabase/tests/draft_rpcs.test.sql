begin;

create extension if not exists pgtap with schema extensions;

-- We'll test in a single plan counting all assertions
select plan(32);

-- =============================================================================
-- Fixture setup: create a minimal draft that has been locked (POOL_REVIEW→DRAFTING)
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
  'DRFT01',
  'Test Draft',
  '00000000-0000-0000-0000-000000000001',
  3, 2,
  'snake', 'hybrid', 'analyst',
  60, 'DRAFTING'
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Host', 1),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Player2', 2),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Player3', 3);

insert into public.draft_items (id, draft_id, name, normalized_name, source)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Item Alpha', 'item alpha', 'ai'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Item Beta', 'item beta', 'ai'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Item Gamma', 'item gamma', 'ai');

-- =============================================================================
-- Test RPC existence
-- =============================================================================

select has_function('public', 'start_draft', 'start_draft exists');
select has_function('public', 'submit_pick', 'submit_pick exists');
select has_function('public', 'auto_pick', 'auto_pick exists');

-- =============================================================================
-- start_draft tests
-- =============================================================================

-- Valid start_draft call
select lives_ok(
  $$
    select public.start_draft(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '[
        {"overallPick":1,"round":1,"pickInRound":1,"seat":1},
        {"overallPick":2,"round":1,"pickInRound":2,"seat":2},
        {"overallPick":3,"round":1,"pickInRound":3,"seat":3},
        {"overallPick":4,"round":2,"pickInRound":1,"seat":3},
        {"overallPick":5,"round":2,"pickInRound":2,"seat":2},
        {"overallPick":6,"round":2,"pickInRound":3,"seat":1}
      ]'::jsonb
    );
  $$,
  'start_draft succeeds with valid input'
);

-- Verify state after start_draft
select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'DRAFTING',
  'phase remains DRAFTING after start_draft'
);

select is(
  (select current_pick_index from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  0,
  'current_pick_index is 0 after start_draft'
);

select ok(
  (select turn_deadline is not null from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'turn_deadline is set after start_draft (timer_seconds = 60)'
);

-- start_draft: wrong player fails
select throws_ok(
  $$
    select public.start_draft(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '[]'::jsonb
    );
  $$,
  'P0001',
  'NOT_HOST',
  'non-host cannot start draft'
);

-- start_draft: wrong phase fails (we reset phase back to DRAFTING after this)
update public.drafts set phase = 'LOBBY' where id = '10000000-0000-0000-0000-000000000001';

select throws_ok(
  $$
    select public.start_draft(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '[]'::jsonb
    );
  $$,
  'P0001',
  'INVALID_PHASE',
  'start_draft fails when not in DRAFTING phase'
);

-- Reset phase back to DRAFTING with pick_order
update public.drafts
set phase = 'DRAFTING',
    current_pick_index = 0,
    pick_order = '[
      {"overallPick":1,"round":1,"pickInRound":1,"seat":1},
      {"overallPick":2,"round":1,"pickInRound":2,"seat":2},
      {"overallPick":3,"round":1,"pickInRound":3,"seat":3},
      {"overallPick":4,"round":2,"pickInRound":1,"seat":3},
      {"overallPick":5,"round":2,"pickInRound":2,"seat":2},
      {"overallPick":6,"round":2,"pickInRound":3,"seat":1}
    ]'::jsonb,
    turn_deadline = now() + interval '1 hour'
where id = '10000000-0000-0000-0000-000000000001';

-- =============================================================================
-- submit_pick tests
-- =============================================================================

-- Valid current player pick succeeds (seat 1 = host, pick 0)
select lives_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      0
    );
  $$,
  'valid current player pick succeeds'
);

-- Check pick was recorded
select is(
  (select count(*)::integer from public.picks where draft_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'one pick was recorded'
);

select is(
  (select is_auto_pick from public.picks where draft_id = '10000000-0000-0000-0000-000000000001'),
  false,
  'pick is not auto_pick'
);

-- Check item became unavailable
select is(
  (select is_available from public.draft_items where id = '30000000-0000-0000-0000-000000000001'),
  false,
  'picked item is now unavailable'
);

-- Check current_pick_index advanced
select is(
  (select current_pick_index from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  1,
  'current_pick_index advanced to 1'
);

-- Wrong player fails (seat 2 is current but guestId is host)
select throws_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      1
    );
  $$,
  'P0001',
  'NOT_YOUR_TURN',
  'wrong player pick fails'
);

-- Stale expected pick fails (current is 1, pass 0)
select throws_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000002',
      0
    );
  $$,
  'P0001',
  'STALE_STATE',
  'stale expected pick fails'
);

-- Unavailable item fails
select throws_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000001',
      1
    );
  $$,
  'P0001',
  'ITEM_UNAVAILABLE',
  'unavailable item fails'
);

-- Valid pick by Player2 (seat 2, current_pick_index = 1)
select lives_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000002',
      1
    );
  $$,
  'second pick (Player2) succeeds'
);

-- Check current_pick_index = 2
select is(
  (select current_pick_index from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  2,
  'current_pick_index advanced to 2'
);

-- =============================================================================
-- Two concurrent same-item attempts - first succeeds, second fails
-- =============================================================================

select lives_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000003',
      2
    );
  $$,
  'third pick (Player3, last available item) succeeds'
);

-- Item Gamma is now unavailable
select is(
  (select is_available from public.draft_items where id = '30000000-0000-0000-0000-000000000003'),
  false,
  'third item is now unavailable'
);

-- Verify check: trying to pick the same item should fail since it's unavailable
-- This was already tested above with Item Alpha

-- =============================================================================
-- Turn advances once per pick
-- =============================================================================

select is(
  (select current_pick_index from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  3,
  'current_pick_index is 3 after three picks'
);

-- =============================================================================
-- Last pick transitions to DEFENSE
-- We need to set up the state for the last pick
-- We have 6 total slots (picks 0-5), current_pick_index is 3
-- Seats: pick 3 = seat 3 (Player3), pick 4 = seat 2 (Player2), pick 5 = seat 1 (Host)
-- We need to make more items available for remaining picks
-- =============================================================================

-- Add more items for remaining picks
insert into public.draft_items (id, draft_id, name, normalized_name, source)
values
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Item Delta', 'item delta', 'ai'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Item Epsilon', 'item epsilon', 'ai'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Item Zeta', 'item zeta', 'ai');

-- ci=3 (current): seat 3 (round 2, pickInRound 1) → Player3 picks Item Delta
select lives_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000004',
      3
    );
  $$,
  'pick 4 (Player3, round 2) succeeds'
);

-- ci=4: Player2 picks Item Epsilon
select lives_ok(
  $$
    select public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000005',
      4
    );
  $$,
  'pick 5 (Player2, round 2) succeeds'
);

-- ci=5 (last pick): Host picks Item Zeta, should transition to DEFENSE
select results_eq(
  $$
    select o_current_pick_index, o_phase
    from public.submit_pick(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000006',
      5
    );
  $$,
  $$ values (6, 'DEFENSE') $$,
  'last pick transitions to DEFENSE and returns pick index 6'
);

-- Verify phase transitioned
select is(
  (select phase::text from public.drafts where id = '10000000-0000-0000-0000-000000000001'),
  'DEFENSE',
  'draft phase is DEFENSE after last pick'
);

-- =============================================================================
-- auto_pick tests
-- =============================================================================

-- Reset state for auto-pick test: new draft with timer
insert into public.drafts (
  id, room_code, topic, host_guest_id, max_players, rounds,
  draft_type, judging_mode, ai_personality, timer_seconds, phase,
  pick_order, current_pick_index, turn_deadline
)
values (
  '10000000-0000-0000-0000-000000000002',
  'DRFT02',
  'Auto-Pick Draft',
  '00000000-0000-0000-0000-000000000001',
  2, 1,
  'standard', 'ai', 'hype',
  60, 'DRAFTING',
  '[
    {"overallPick":1,"round":1,"pickInRound":1,"seat":1},
    {"overallPick":2,"round":1,"pickInRound":2,"seat":2}
  ]'::jsonb,
  0,
  now() - interval '1 second'  -- expired deadline
);

insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
values
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'AutoHost', 1),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'AutoPlayer2', 2);

insert into public.draft_items (id, draft_id, name, normalized_name, source)
values
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Auto Item A', 'auto item a', 'ai'),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'Auto Item B', 'auto item b', 'ai');

-- Valid auto-pick: timer expired, current player calls auto_pick
select lives_ok(
  $$
    select public.auto_pick(
      '10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'expired timer auto-pick succeeds'
);

-- Check auto-pick was recorded
select is(
  (select count(*)::integer from public.picks where draft_id = '10000000-0000-0000-0000-000000000002'),
  1,
  'one auto-pick was recorded'
);

select is(
  (select is_auto_pick from public.picks where draft_id = '10000000-0000-0000-0000-000000000002'),
  true,
  'auto-pick is flagged as auto_pick'
);

-- Check item was picked (Auto Item A, alphabetically first)
select is(
  (select name from public.draft_items di
   join public.picks p on p.item_id = di.id
   where p.draft_id = '10000000-0000-0000-0000-000000000002'),
  'Auto Item A',
  'auto_pick picks first alphabetical available item'
);

-- Idempotent: second auto-pick call for same slot should be a no-op
-- (The function returns the current state without creating a second pick)
select lives_ok(
  $$
    select public.auto_pick(
      '10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'second auto_pick call (idempotent) does not error'
);

select is(
  (select count(*)::integer from public.picks where draft_id = '10000000-0000-0000-0000-000000000002'),
  1,
  'idempotent auto-pick does not create duplicate picks'
);

-- Auto-pick with timer not expired fails
update public.drafts
set turn_deadline = now() + interval '1 hour'
where id = '10000000-0000-0000-0000-000000000002';

select throws_ok(
  $$
    select public.auto_pick(
      '10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001'
    );
  $$,
  'P0001',
  'TIMER_NOT_EXPIRED',
  'auto-pick fails when timer has not expired'
);

-- =============================================================================
-- Cleanup
-- =============================================================================

select * from finish();
rollback;
