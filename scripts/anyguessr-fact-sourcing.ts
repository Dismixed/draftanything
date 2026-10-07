#!/usr/bin/env tsx
/**
 * scripts/anyguessr-fact-sourcing.ts
 *
 * Drafts a fun fact for each AnyGuessr clue from a real Wikipedia article, and checks it.
 * A fact is about what the clue shows (the dish, the animal, the landmark), not the country.
 *
 *   draft   — read the clues, fetch each clue's article, draft a fact with the sentence that
 *             supports it, and check it; writes a record file and touches nothing else
 *   report  — summarise a record file: what verified, what was rejected and why
 *   import  — store the verified facts on their clues, as unreviewed (needs the
 *             ag_seed_entries fun-fact migration)
 *
 * A fact is "verified" when its supporting sentence appears word for word in the article, it adds no
 * numbers of its own, it is not time-relative, and an independent read of the sentence alone finds
 * that it establishes the fact. That narrows errors; it does not remove them. Nothing here shows a
 * fact to players: a person approves each one on /admin/anyguessr/review first.
 *
 * Usage:
 *   npx tsx scripts/anyguessr-fact-sourcing.ts draft  [--out=data/anyguessr/facts-2026-10.json] [--limit=N] [--type=food] [--retry]
 *   npx tsx scripts/anyguessr-fact-sourcing.ts report [--out=...]
 *   npx tsx scripts/anyguessr-fact-sourcing.ts import [--out=...] [--overwrite] [--dry-run]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const [mode, ...flags] = process.argv.slice(2);
if (!["draft", "report", "import"].includes(mode)) {
  console.error("Usage: npx tsx scripts/anyguessr-fact-sourcing.ts <draft|report|import> [--out=file] [--limit=N] [--type=clue_type] [--retry] [--overwrite]");
  process.exit(1);
}
const flag = (name: string) => flags.find((f) => f.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => flags.includes(`--${name}`);

const OUT = flag("out") ?? "data/anyguessr/facts-2026-10.json";
const LIMIT = Number(flag("limit")) || Infinity;
const ONLY_TYPE = flag("type");
const CONCURRENCY = 4;
const CACHE_DIR = ".cache/anyguessr-wiki";

/** Clue types the game keeps. Currency and jersey are retired. */
const TYPES = ["flag", "landmark", "environment", "food", "person", "brand", "wildlife", "written_language"];

async function connect() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type FactRecord = import("../lib/anyguessr/fun-fact-sourcing").FactRecord;

function readRecords(): FactRecord[] {
  return existsSync(OUT) ? (JSON.parse(readFileSync(OUT, "utf8")) as FactRecord[]) : [];
}

function writeRecords(records: FactRecord[]) {
  mkdirSync(OUT.slice(0, OUT.lastIndexOf("/")), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(records, null, 2)}\n`);
}

/** Article text is fetched once per title and kept, so a rerun does not ask Wikipedia again. */
async function cachedArticle(title: string): Promise<string | null> {
  const { fetchRenderedArticle, extractArticleText } = await import("../lib/anyguessr/wiki-article");
  mkdirSync(CACHE_DIR, { recursive: true });
  const file = `${CACHE_DIR}/${createHash("sha1").update(title).digest("hex")}.txt`;
  if (existsSync(file)) {
    const text = readFileSync(file, "utf8");
    return text === "\0missing" ? null : text;
  }
  const html = await fetchRenderedArticle(title);
  const text = html ? extractArticleText(html) : null;
  writeFileSync(file, text ?? "\0missing");
  return text;
}

async function draft() {
  const db = await connect();
  const { listSeedEntries } = await import("../lib/anyguessr/seed-db");
  const { mapPool } = await import("../lib/anyguessr/async-pool");
  const { sourceFunFact, defaultSourcingDeps } = await import("../lib/anyguessr/fun-fact-sourcing");
  const { articleTitlesFor } = await import("../lib/anyguessr/wiki-article");

  const entries = await listSeedEntries(db, { limit: 5000 });
  const records = readRecords();
  const done = new Map(records.map((r) => [r.id, r]));

  const todo = entries
    .filter((e) => TYPES.includes(e.clue_type) && (!ONLY_TYPE || e.clue_type === ONLY_TYPE) && e.status !== "rejected")
    .filter((e) => !done.has(e.id) || (has("retry") && done.get(e.id)!.verdict !== "verified"))
    .slice(0, LIMIT);

  console.log(`${todo.length} clue${todo.length === 1 ? "" : "s"} to source (${records.length} already in ${OUT}).`);

  // Countries that share an article (every Spanish-language clue) should not all get the same fact.
  const used = new Map<string, string[]>();
  let finished = 0;

  await mapPool(todo, CONCURRENCY, async (entry) => {
    const key = articleTitlesFor(entry)[0] ?? entry.id;
    const label = `${entry.country_common} ${entry.clue_type} (${entry.wiki_title ?? entry.text_content ?? "flag"})`;
    try {
      const record = await sourceFunFact(entry, { getArticle: cachedArticle, ...defaultSourcingDeps }, used.get(key) ?? []);
      if (record.verdict === "verified" && record.fun_fact) used.set(key, [...(used.get(key) ?? []), record.fun_fact]);
      done.set(record.id, record);
      console.log(`${++finished}/${todo.length} ${record.verdict === "verified" ? "OK  " : record.verdict === "no_source" ? "NONE" : "FAIL"} ${label}${record.reason ? `: ${record.reason}` : ""}`);
    } catch (err) {
      console.error(`${++finished}/${todo.length} ERR  ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (finished % 10 === 0) writeRecords([...done.values()]);
  });

  writeRecords([...done.values()]);
  report();
}

function report() {
  const records = readRecords();
  const by = (pick: (r: FactRecord) => string) => {
    const counts: Record<string, number> = {};
    for (const r of records) counts[pick(r)] = (counts[pick(r)] ?? 0) + 1;
    return counts;
  };

  console.log(`\n${records.length} clues in ${OUT}`);
  console.log("By verdict:", by((r) => r.verdict));
  for (const type of TYPES) {
    const rows = records.filter((r) => r.clue_type === type);
    if (rows.length) console.log(`  ${type.padEnd(17)} ${rows.filter((r) => r.verdict === "verified").length}/${rows.length} verified`);
  }
  console.log("Why the rest were not verified:", by((r) => (r.verdict === "verified" ? "(verified)" : (r.reason ?? "unknown"))));
}

async function importVerified() {
  const db = await connect();
  const { getSeedEntry, updateSeedEntry } = await import("../lib/anyguessr/seed-db");

  const dryRun = has("dry-run");
  const probe = await db.from("ag_seed_entries").select("fun_fact").limit(1);
  if (probe.error && !dryRun) throw new Error(`ag_seed_entries has no fun_fact column yet; apply the migration first (${probe.error.message})`);

  const verified = readRecords().filter((r) => r.verdict === "verified" && r.fun_fact && r.source_url && r.evidence);
  let imported = 0;
  let skipped = 0;

  for (const record of verified) {
    const entry = await getSeedEntry(db, record.id);
    const subject = entry && (entry.clue_type === "written_language" ? entry.text_content : entry.wiki_title);
    // Skip a clue that changed since it was sourced, and one that already has a fact.
    if (!entry || subject !== record.subject || (entry.fun_fact && !has("overwrite"))) {
      skipped++;
      continue;
    }
    if (dryRun) {
      imported++;
      continue;
    }
    await updateSeedEntry(db, entry.id, {
      fun_fact: record.fun_fact,
      fun_fact_source_url: record.source_url,
      fun_fact_evidence: record.evidence,
    });
    imported++;
  }

  if (dryRun) {
    console.log(`Dry run: would import ${imported} verified facts; would skip ${skipped} (clue changed since sourcing, or already has a fact).${probe.error ? " The fun_fact column does not exist yet." : ""}`);
    return;
  }
  console.log(`Imported ${imported} facts as unreviewed; skipped ${skipped}. Approve them on /admin/anyguessr/review (Only facts awaiting review).`);
}

(mode === "draft" ? draft() : mode === "report" ? Promise.resolve(report()) : importVerified()).catch((err) => {
  console.error("Fact sourcing failed:", err);
  process.exit(1);
});
