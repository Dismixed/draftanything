-- submit_pick gained optional params in 202606170005; CREATE OR REPLACE kept the old
-- 4-arg overload, so RPC calls with named args became ambiguous.
drop function if exists public.submit_pick(uuid, uuid, uuid, integer);
