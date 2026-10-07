#!/usr/bin/env tsx
/**
 * scripts/anyguessr-backfill-facts.ts
 *
 * Drafts a fun fact for every AnyGuessr clue that has none. A fact is about what the clue
 * shows (the dish, the animal, the landmark), and it is shown after the round.
 *
 *   plan   — count the clues that need a fact; writes nothing
 *   apply  — draft the facts and store them as unreviewed
 *
 * Usage:
 *   npx tsx scripts/anyguessr-backfill-facts.ts plan
 *   npx tsx scripts/anyguessr-backfill-facts.ts apply --limit=50
 *   npx tsx scripts/anyguessr-backfill-facts.ts apply --type=food
 *
 * Nothing here shows a fact to players. A person approves each one on the clue review
 * page ("Only facts awaiting review"), and a fact is shown only after that.
 */

import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const [mode, ...flags] = process.argv.slice(2);
if (!["plan", "apply"].includes(mode)) {
  console.error("Usage: npx tsx scripts/anyguessr-backfill-facts.ts <plan|apply> [--limit=N] [--type=clue_type]");
  process.exit(1);
}
const flag = (name: string) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const limit = Number(flag("limit")) || Infinity;
const onlyType = flag("type");

/** Pause between model calls, to stay inside the API's rate limit. */
const DELAY_MS = 400;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Clue types the game keeps. Currency and jersey are retired. */
const TYPES = ["flag", "landmark", "environment", "food", "person", "brand", "wildlife", "written_language"];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const { createClient } = await import("@supabase/supabase-js");
  const { listSeedEntries, updateSeedEntry } = await import("../lib/anyguessr/seed-db");
  const { factSubject, proposeFunFact } = await import("../lib/anyguessr/fun-fact-propose");

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const entries = await listSeedEntries(db, { limit: 5000 });

  const todo = entries
    .filter((e) => TYPES.includes(e.clue_type) && (!onlyType || e.clue_type === onlyType))
    .filter((e) => e.status !== "rejected" && !e.fun_fact && factSubject(e))
    .slice(0, limit);

  console.log(`${todo.length} clue${todo.length === 1 ? "" : "s"} need a fact.`);
  if (mode === "plan") return;

  let drafted = 0;
  for (const [i, entry] of todo.entries()) {
    const label = `${entry.country_common} ${entry.clue_type} (${factSubject(entry)})`;
    try {
      const fact = await proposeFunFact(entry);
      if (!fact) {
        console.log(`${i + 1}/${todo.length} SKIP ${label}: no fact`);
      } else {
        await updateSeedEntry(db, entry.id, { fun_fact: fact });
        drafted++;
        console.log(`${i + 1}/${todo.length} OK   ${label}: ${fact}`);
      }
    } catch (err) {
      console.error(`${i + 1}/${todo.length} FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDrafted ${drafted} facts. Review them at /admin/anyguessr/review (Only facts awaiting review).`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
