#!/usr/bin/env tsx
/**
 * AnyGuessr seed script.
 *
 * Walks the curated country seed in lib/anyguessr/seed.ts, calls the online
 * generator (REST Countries + Wikipedia REST) for each entry, upserts puzzles
 * into the `ag_puzzles` table, and schedules today's daily puzzle.
 *
 * Usage:
 *   npx tsx scripts/seed-anyguessr.ts           # full seed (all countries)
 *   npx tsx scripts/seed-anyguessr.ts --limit 5  # first 5 only (smoke test)
 */

import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local" });

// Must load before any import that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { generateAll, scheduleDailyPuzzle } = await import(
    "../lib/anyguessr/generator"
  );

  const db = createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("AnyGuessr: generating puzzles from curated seed…");
  if (limit) console.log(`  (limit=${limit})`);
  const result = await generateAll(db, limit ? { limit } : undefined);
  console.log(
    `\nResult: ${result.succeeded}/${result.total} succeeded, ${result.failed} failed.`,
  );
  for (const r of result.results) {
    if (!r.ok) {
      console.log(`  ${r.country} (${r.cca3}): ${r.error}`);
    }
  }

  console.log("\nAnyGuessr: scheduling today's daily puzzle…");
  const daily = await scheduleDailyPuzzle(db);
  if (!daily) {
    console.log("  Skipped — no approved puzzles to schedule.");
  } else {
    console.log(
      `  ok — puzzle=${daily.puzzleId} date=${daily.date} ${daily.alreadyScheduled ? "(already scheduled)" : "(newly scheduled)"}`,
    );
  }

  console.log("\nSeed complete!");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});