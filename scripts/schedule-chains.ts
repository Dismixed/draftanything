#!/usr/bin/env tsx
/**
 * scripts/schedule-chains.ts
 *
 * Auto-schedules approved Chain Link puzzles onto the daily calendar,
 * spacing out repeated start letters across the week and balancing
 * difficulty. Reads from `chain_puzzles` (status = approved) and writes
 * to `daily_chain_puzzles`.
 *
 * Usage:
 *   npx tsx scripts/schedule-chains.ts                       # start today
 *   npx tsx scripts/schedule-chains.ts --start=2026-09-01    # start on a date
 */

import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local" });

const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const startArg = process.argv.find((a) => a.startsWith("--start="));
const startDate = startArg ? startArg.split("=")[1] : undefined;

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const { autoScheduleApprovedPuzzles } = await import(
    "../lib/chainlink/schedule-service"
  );

  const db = createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await autoScheduleApprovedPuzzles(db, { startDate });

  console.log(
    `Scheduled ${result.scheduled} puzzle(s), skipped ${result.skippedAlreadyScheduled} already on the calendar.`,
  );
  console.log(`Range: ${result.startDate} → ${result.endDate ?? "n/a"}`);
  for (const entry of result.entries) {
    console.log(`  ${entry.publishDate}: ${entry.puzzleId}`);
  }
}

main().catch((err) => {
  console.error("Schedule failed:", err);
  process.exit(1);
});
