begin;

create extension if not exists pgtap with schema extensions;

select plan(76);

select has_extension('pgcrypto', 'pgcrypto extension is enabled');
select has_extension('citext', 'citext extension is enabled');

select has_table('public', 'guest_sessions', 'guest_sessions exists');
select has_table('public', 'drafts', 'drafts exists');
select has_table('public', 'draft_players', 'draft_players exists');
select has_table('public', 'draft_items', 'draft_items exists');
select has_table('public', 'picks', 'picks exists');
select has_table('public', 'pool_suggestions', 'pool_suggestions exists');
select has_table('public', 'commentary', 'commentary exists');
select has_table('public', 'arguments', 'arguments exists');
select has_table('public', 'votes', 'votes exists');
select has_table('public', 'judgments', 'judgments exists');

select has_type('public', 'draft_phase', 'draft_phase exists');
select has_type('public', 'draft_type', 'draft_type exists');
select has_type('public', 'judging_mode', 'judging_mode exists');
select has_type('public', 'ai_personality', 'ai_personality exists');
select has_type('public', 'suggestion_action', 'suggestion_action exists');
select has_type('public', 'suggestion_status', 'suggestion_status exists');
select has_type('public', 'item_source', 'item_source exists');
select has_type('public', 'judgment_source', 'judgment_source exists');
select has_type('public', 'picking_mode', 'picking_mode exists');

select columns_are(
  'public',
  'guest_sessions',
  array['id', 'token_hash', 'created_at', 'expires_at'],
  'guest_sessions has only approved columns'
);
select columns_are(
  'public',
  'drafts',
  array[
    'id', 'room_code', 'topic', 'phase', 'host_guest_id', 'max_players',
    'rounds', 'draft_type', 'judging_mode', 'ai_personality',
    'custom_judge_prompt', 'picking_mode', 'timer_seconds', 'pick_order',
    'current_pick_index', 'turn_deadline', 'rubric', 'created_at', 'completed_at'
  ],
  'drafts has approved columns'
);
select columns_are(
  'public',
  'draft_players',
  array[
    'id', 'draft_id', 'guest_id', 'display_name', 'seat', 'is_ready',
    'removed_at', 'joined_at'
  ],
  'draft_players has approved columns'
);
select columns_are(
  'public',
  'draft_items',
  array[
    'id', 'draft_id', 'name', 'normalized_name', 'source',
    'hidden_metadata', 'is_available', 'created_at'
  ],
  'draft_items has approved columns'
);
select columns_are(
  'public',
  'picks',
  array[
    'id', 'draft_id', 'player_id', 'item_id', 'item_name', 'overall_pick',
    'round', 'pick_in_round', 'is_auto_pick', 'forfeited', 'created_at'
  ],
  'picks has approved columns'
);
select columns_are(
  'public',
  'pool_suggestions',
  array[
    'id', 'draft_id', 'player_id', 'action', 'target_item_id',
    'suggested_name', 'status', 'decided_at'
  ],
  'pool_suggestions has approved columns'
);
select columns_are(
  'public',
  'commentary',
  array[
    'id', 'draft_id', 'pick_id', 'personality', 'text', 'trigger_tags',
    'model', 'prompt_version', 'idempotency_key', 'created_at'
  ],
  'commentary has approved columns'
);
select columns_are(
  'public',
  'arguments',
  array[
    'id', 'draft_id', 'player_id', 'defense_text', 'skipped',
    'submitted_at'
  ],
  'arguments has approved columns'
);
select columns_are(
  'public',
  'votes',
  array[
    'id', 'draft_id', 'voter_player_id', 'selected_player_id', 'created_at'
  ],
  'votes has approved columns'
);
select columns_are(
  'public',
  'judgments',
  array[
    'id', 'draft_id', 'source', 'player_scores', 'ranking',
    'winner_player_ids', 'awards', 'explanation', 'model',
    'prompt_version', 'idempotency_key', 'created_at'
  ],
  'judgments has approved columns'
);

select has_index('public', 'drafts', 'drafts_room_code_key', 'room codes are indexed uniquely');
select has_index('public', 'draft_players', 'draft_players_active_guest_key', 'active guests are unique per draft');
select has_index('public', 'draft_players', 'draft_players_active_seat_key', 'active seats are unique per draft');
select has_index('public', 'draft_items', 'draft_items_draft_id_normalized_name_key', 'normalized items are unique per draft');
select has_index('public', 'picks', 'picks_draft_id_overall_pick_key', 'pick slots are unique per draft');
select has_index('public', 'picks', 'picks_draft_id_item_id_key', 'picked items are unique per draft');
select has_index('public', 'votes', 'votes_draft_id_voter_player_id_key', 'voters are unique per draft');
select has_index('public', 'drafts', 'drafts_phase_idx', 'draft phase reads are indexed');
select has_index('public', 'draft_players', 'draft_players_draft_id_idx', 'draft player reads are indexed');
select has_index('public', 'draft_items', 'draft_items_draft_available_idx', 'available item reads are indexed');
select has_index('public', 'picks', 'picks_draft_order_idx', 'ordered pick reads are indexed');
select has_index('public', 'picks', 'picks_draft_item_name_lower_idx', 'lowercase item names are indexed for duplicate checking');

select ok(
  not exists (
    select 1
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname in (
        'guest_sessions_token_hash_nonempty',
        'guest_sessions_expiry_after_creation',
        'drafts_max_players_range',
        'drafts_rounds_range',
        'drafts_timer_seconds_range',
        'draft_players_seat_range',
        'pool_suggestions_action_payload',
        'picks_valid_pick',
        'arguments_skip_or_defense',
        'votes_not_self'
      )
    group by connamespace
    having count(*) <> 10
  )
  and (
    select count(*)
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname in (
        'guest_sessions_token_hash_nonempty',
        'guest_sessions_expiry_after_creation',
        'drafts_max_players_range',
        'drafts_rounds_range',
        'drafts_timer_seconds_range',
        'draft_players_seat_range',
        'pool_suggestions_action_payload',
        'picks_valid_pick',
        'arguments_skip_or_defense',
        'votes_not_self'
      )
  ) = 10,
  'required named check constraints exist'
);

select ok(
  (
    select count(*)
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname = any(array[
        'guest_sessions', 'drafts', 'draft_players', 'draft_items', 'picks',
        'pool_suggestions', 'commentary', 'arguments', 'votes', 'judgments'
      ])
      and relrowsecurity
  ) = 10,
  'RLS is enabled on every authoritative table'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'safe_draft_items'
      and column_name = 'hidden_metadata'
  ),
  'safe_draft_items excludes hidden_metadata'
);

select ok(
  (
    select count(*)
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname = any(array[
        'safe_drafts', 'safe_draft_players', 'safe_draft_items', 'safe_picks',
        'safe_pool_suggestions', 'safe_commentary', 'safe_arguments',
        'safe_votes', 'safe_judgments'
      ])
      and relkind = 'v'
      and coalesce(array_to_string(reloptions, ','), '') like '%security_invoker=true%'
  ) = 9,
  'all browser-safe views use security_invoker'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name = any(array[
        'guest_sessions', 'drafts', 'draft_players', 'draft_items', 'picks',
        'pool_suggestions', 'commentary', 'arguments', 'votes', 'judgments'
      ])
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ),
  'anon cannot mutate authoritative tables'
);

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where grantee = 'authenticated'
      and table_schema = 'public'
      and table_name = any(array[
        'guest_sessions', 'drafts', 'draft_players', 'draft_items', 'picks',
        'pool_suggestions', 'commentary', 'arguments', 'votes', 'judgments'
      ])
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ),
  'authenticated cannot mutate authoritative tables'
);

select ok(
  has_table_privilege('anon', 'public.safe_draft_items', 'SELECT'),
  'anon can read safe views'
);
select ok(
  has_table_privilege('authenticated', 'public.safe_draft_items', 'SELECT'),
  'authenticated can read safe views'
);

select ok(
  not has_column_privilege('anon', 'public.guest_sessions', 'token_hash', 'SELECT'),
  'anon cannot read guest token hashes'
);
select ok(
  not has_column_privilege('authenticated', 'public.draft_items', 'hidden_metadata', 'SELECT'),
  'authenticated cannot read hidden item metadata'
);
select ok(
  not has_column_privilege('anon', 'public.draft_players', 'guest_id', 'SELECT'),
  'anon cannot read guest identifiers'
);
select ok(
  not has_column_privilege('authenticated', 'public.drafts', 'host_guest_id', 'SELECT'),
  'authenticated cannot read host guest identifiers'
);
select ok(
  not has_column_privilege('anon', 'public.commentary', 'idempotency_key', 'SELECT'),
  'anon cannot read service idempotency keys'
);

select ok(
  (
    select count(*)
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = any(array[
        'drafts', 'draft_players', 'draft_items', 'picks', 'pool_suggestions',
        'commentary', 'arguments', 'votes', 'judgments', 'pick_veto_votes'
      ])
  ) = 10,
  'all authoritative live tables are in the realtime publication'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'draft_players'
      and column_name = 'connection_state'
  ),
  'connection state is not persisted'
);

select lives_ok(
  $seed$
    insert into public.guest_sessions (id, token_hash, created_at, expires_at)
    values
      ('00000000-0000-0000-0000-000000000001', 'host-token-hash', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00'),
      ('00000000-0000-0000-0000-000000000002', 'guest-token-hash', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00'),
      ('00000000-0000-0000-0000-000000000003', 'third-token-hash', '2026-06-15 12:00:00+00', '2026-06-16 12:00:00+00');

    insert into public.drafts (
      id, room_code, topic, host_guest_id, max_players, rounds,
      draft_type, judging_mode, ai_personality
    )
    values (
      '10000000-0000-0000-0000-000000000001', 'ABC123', 'Best SQL features',
      '00000000-0000-0000-0000-000000000001', 3, 2,
      'snake', 'hybrid', 'analyst'
    );

    insert into public.draft_players (id, draft_id, guest_id, display_name, seat)
    values
      ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Host', 1),
      ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Guest', 2);

    insert into public.draft_items (id, draft_id, name, normalized_name, source)
    values
      ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Transactions', 'transactions', 'ai'),
      ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Indexes', 'indexes', 'manual');

    insert into public.picks (
      id, draft_id, player_id, item_id, overall_pick, round, pick_in_round
    )
    values (
      '40000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      1, 1, 1
    );

    insert into public.votes (
      id, draft_id, voter_player_id, selected_player_id
    )
    values (
      '50000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002'
    );
  $seed$,
  'valid fixtures can be seeded'
);

select throws_ok(
  $$insert into public.guest_sessions (token_hash, expires_at) values ('host-token-hash', now() + interval '1 day')$$,
  '23505',
  null,
  'guest token hashes are unique'
);
select throws_ok(
  $$insert into public.drafts (room_code, topic, host_guest_id, max_players, rounds, draft_type, judging_mode, ai_personality) values ('ABC123', 'Duplicate room', '00000000-0000-0000-0000-000000000001', 2, 1, 'standard', 'ai', 'analyst')$$,
  '23505',
  null,
  'room codes are unique'
);
select throws_ok(
  $$insert into public.draft_players (draft_id, guest_id, display_name, seat) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Duplicate host', 3)$$,
  '23505',
  null,
  'active guests cannot join a draft twice'
);
select throws_ok(
  $$insert into public.draft_players (draft_id, guest_id, display_name, seat) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Duplicate seat', 2)$$,
  '23505',
  null,
  'active seats cannot be occupied twice'
);
select throws_ok(
  $$insert into public.draft_items (draft_id, name, normalized_name, source) values ('10000000-0000-0000-0000-000000000001', 'TRANSACTIONS', 'transactions', 'manual')$$,
  '23505',
  null,
  'normalized items are unique per draft'
);
select throws_ok(
  $$insert into public.picks (draft_id, player_id, item_id, overall_pick, round, pick_in_round) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 1, 1, 2)$$,
  '23505',
  null,
  'pick slots are unique per draft'
);
select throws_ok(
  $$insert into public.picks (draft_id, player_id, item_id, overall_pick, round, pick_in_round) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 2, 1, 2)$$,
  '23505',
  null,
  'items cannot be picked twice per draft'
);
select throws_ok(
  $$insert into public.pool_suggestions (draft_id, player_id, action) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'remove')$$,
  '23514',
  null,
  'removal suggestions require a target item'
);
select throws_ok(
  $$insert into public.pool_suggestions (draft_id, player_id, action) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'add')$$,
  '23514',
  null,
  'addition suggestions require a nonblank name'
);
select throws_ok(
  $$insert into public.arguments (draft_id, player_id, defense_text, skipped) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', null, false)$$,
  '23514',
  null,
  'arguments require either a defense or an explicit skip'
);
select throws_ok(
  $$insert into public.votes (draft_id, voter_player_id, selected_player_id) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002')$$,
  '23514',
  null,
  'self votes are rejected'
);
select throws_ok(
  $$insert into public.votes (draft_id, voter_player_id, selected_player_id) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')$$,
  '23505',
  null,
  'a voter can vote only once per draft'
);
select ok(
  not has_table_privilege('anon', 'public.picks', 'INSERT'),
  'anon cannot insert picks directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.votes', 'INSERT'),
  'authenticated cannot insert votes directly'
);

select throws_ok(
  $$insert into public.picks (draft_id, player_id, item_id, item_name, overall_pick, round, pick_in_round) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'both set', 2, 1, 2)$$,
  '23514',
  null,
  'picks cannot have both item_id and item_name'
);
select throws_ok(
  $$insert into public.picks (draft_id, player_id, item_name, overall_pick, round, pick_in_round) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '   ', 2, 1, 2)$$,
  '23514',
  null,
  'item_name should not be just whitespace (trimmed to empty, so does not satisfy length > 0)'
);
select lives_ok(
  $$insert into public.picks (draft_id, player_id, item_name, overall_pick, round, pick_in_round) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Off the dome item', 2, 1, 2)$$,
  'valid off-the-dome pick with item_name is accepted'
);
select throws_ok(
  $$insert into public.drafts (room_code, topic, host_guest_id, max_players, rounds, draft_type, judging_mode, ai_personality, picking_mode) values ('OTD001', 'Test invalid picking mode', '00000000-0000-0000-0000-000000000001', 2, 1, 'standard', 'ai', 'analyst', 'invalid')$$,
  '22P02',
  null,
  'invalid picking_mode values are rejected'
);

select * from finish();
rollback;
