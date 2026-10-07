#!/usr/bin/env tsx
/**
 * scripts/build-lexicon.ts
 *
 * Builds the scored Chain Link phrase lexicon:
 *
 *   1. Candidates — closed compounds ("football" → foot + ball) and frequent
 *                   two-word sequences from Peter Norvig's n-gram counts
 *                   (https://norvig.com/ngrams/), plus the hand-written pairs
 *                   in seed-phrases.ts and whatever is already in chain_phrases
 *   2. Gate       — two LLM passes: a broad screen over every candidate, then
 *                   a strict dictionary-entry check on the survivors
 *   3. Review     — editorial removals and familiarity corrections from
 *                   data/chainlink/lexicon-review.json
 *   4. Score      — 1–10 commonness score: the gate's familiarity rating
 *                   picks the band, corpus count ranks within it
 *   5. Output     — data/chainlink/lexicon.json
 *
 * Nothing is written to the database unless you pass `--write`.
 *
 * Usage:
 *   npx tsx scripts/build-lexicon.ts              # build + report
 *   npx tsx scripts/build-lexicon.ts --no-gate    # candidate counts only, no LLM calls
 *   npx tsx scripts/build-lexicon.ts --limit=3    # judge at most 3 new batches per stage
 *   npx tsx scripts/build-lexicon.ts --write      # + upsert into chain_phrases and
 *                                                 #   deactivate rows not in the lexicon
 *
 * Gate verdicts are cached in .cache/chainlink-lexicon/, so an interrupted
 * run resumes where it stopped.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local" });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const CACHE_DIR = ".cache/chainlink-lexicon";
const OUTPUT_PATH = "data/chainlink/lexicon.json";
const REVIEW_PATH = "data/chainlink/lexicon-review.json";
const SOURCE = "lexicon-v1";

const COUNT_FILES = {
  unigrams: "count_1w.txt",
  bigrams: "count_2w.txt",
} as const;

const CANDIDATE_OPTIONS = {
  maxHalfRank: 6000,
  minClosedCount: 150_000,
  minVocabUses: 2,
};

const GATE_BATCH_SIZE = 100;
/** Phrases the strict pass rates below this are too obscure to play fairly. */
const MIN_FAMILIARITY = 3;
const GATE_CONCURRENCY = 4;

interface CachedVerdict {
  phrase: string;
  valid: boolean;
  familiarity: number;
  category: string;
}

interface LexiconEntry {
  word_a: string;
  word_b: string;
  score: number;
  form: string;
  familiarity: number;
  category: string;
}

async function loadCounts(file: string): Promise<string> {
  const path = `${CACHE_DIR}/${file}`;
  if (!existsSync(path)) {
    console.log(`Downloading ${file}…`);
    const res = await fetch(`https://norvig.com/ngrams/${file}`);
    if (!res.ok) throw new Error(`Failed to download ${file}: ${res.status}`);
    writeFileSync(path, await res.text());
  }
  return readFileSync(path, "utf8");
}

/** Pairs from seed-phrases.ts, read as text because importing it runs the seed. */
function handWrittenPairs(): [string, string][] {
  const source = readFileSync("scripts/seed-phrases.ts", "utf8");
  const pairs: [string, string][] = [];
  for (const match of source.matchAll(/word_a: "([a-z]+)", word_b: "([a-z]+)"/g)) {
    pairs.push([match[1], match[2]]);
  }
  return pairs;
}

async function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

interface ExistingRow {
  id: string;
  word_a: string;
  word_b: string;
}

async function loadExistingRows(db: Db): Promise<ExistingRow[]> {
  // Paged: a single response stops at 1000 rows.
  const rows: ExistingRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("chain_phrases")
      .select("id, word_a, word_b")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Failed to load chain_phrases: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

type Verdicts = Map<string, CachedVerdict>;

/**
 * Judges every phrase not already in this stage's cache, appending verdicts
 * as they arrive. Failed batches are left unjudged for the next run.
 */
async function runGate(
  stage: "screen" | "strict",
  phrases: string[],
  batchLimit: number,
): Promise<Verdicts> {
  const cachePath = `${CACHE_DIR}/verdicts-${stage}.jsonl`;
  const verdicts: Verdicts = new Map();
  if (existsSync(cachePath)) {
    for (const line of readFileSync(cachePath, "utf8").split("\n")) {
      if (!line) continue;
      const verdict = JSON.parse(line) as CachedVerdict;
      verdicts.set(verdict.phrase, verdict);
    }
  }

  const pending = phrases.filter((phrase) => !verdicts.has(phrase));
  const batches: string[][] = [];
  for (let i = 0; i < pending.length && batches.length < batchLimit; i += GATE_BATCH_SIZE) {
    batches.push(pending.slice(i, i + GATE_BATCH_SIZE));
  }
  if (batches.length === 0) return verdicts;

  console.log(`Gate (${stage}): ${pending.length} unjudged, running ${batches.length} batch(es)…`);
  const { judgeLinks } = await import("../lib/chainlink/lexicon/gate");
  const { mapPool } = await import("../lib/anyguessr/async-pool");
  let done = 0;
  await mapPool(batches, GATE_CONCURRENCY, async (batch) => {
    try {
      const judged = await judgeLinks(batch, stage);
      for (const verdict of judged.values()) {
        verdicts.set(verdict.phrase, verdict);
        appendFileSync(cachePath, `${JSON.stringify(verdict)}\n`);
      }
    } catch (err) {
      console.error(`  batch failed (will retry next run): ${(err as Error).message}`);
    }
    if (++done % 10 === 0) console.log(`  ${done}/${batches.length} batches`);
  });
  return verdicts;
}

function tally(values: (string | number)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

async function writeToDb(db: Db, entries: LexiconEntry[], existing: ExistingRow[]) {
  const { mapPool } = await import("../lib/anyguessr/async-pool");
  const idByPair = new Map(
    existing.map((row) => [`${row.word_a} ${row.word_b}`.toLowerCase(), row.id]),
  );

  const updates = entries.filter((e) => idByPair.has(`${e.word_a} ${e.word_b}`));
  const inserts = entries.filter((e) => !idByPair.has(`${e.word_a} ${e.word_b}`));

  await mapPool(updates, 8, async (entry) => {
    const { error } = await db
      .from("chain_phrases")
      .update({ commonness_score: entry.score, category: entry.category })
      .eq("id", idByPair.get(`${entry.word_a} ${entry.word_b}`)!);
    if (error) throw new Error(`Failed to rescore "${entry.word_a} ${entry.word_b}": ${error.message}`);
  });

  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await db.from("chain_phrases").insert(
      inserts.slice(i, i + 500).map((entry) => ({
        word_a: entry.word_a,
        word_b: entry.word_b,
        phrase: `${entry.word_a} ${entry.word_b}`,
        commonness_score: entry.score,
        category: entry.category,
        source: SOURCE,
        is_active: true,
      })),
    );
    if (error) throw new Error(`Failed to insert phrases: ${error.message}`);
  }

  // Rows the lexicon no longer vouches for stop feeding the generator.
  const kept = new Set(entries.map((e) => `${e.word_a} ${e.word_b}`));
  const retired = existing.filter((row) => !kept.has(`${row.word_a} ${row.word_b}`.toLowerCase()));
  if (retired.length > 0) {
    const { error } = await db
      .from("chain_phrases")
      .update({ is_active: false })
      .in("id", retired.map((row) => row.id));
    if (error) throw new Error(`Failed to deactivate phrases: ${error.message}`);
  }

  console.log(
    `\nDatabase: ${updates.length} rescored, ${inserts.length} inserted, ${retired.length} deactivated` +
      (retired.length > 0 ? ` (${retired.map((row) => `${row.word_a} ${row.word_b}`).join(", ")}).` : "."),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const batchLimit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  mkdirSync(CACHE_DIR, { recursive: true });

  const { buildCandidates, dropInflectedDuplicates, parseCounts } = await import(
    "../lib/chainlink/lexicon/candidates"
  );
  const { scoreLinks } = await import("../lib/chainlink/lexicon/score");

  const unigrams = parseCounts(await loadCounts(COUNT_FILES.unigrams));
  // Capitalised sequences are mostly names and titles; keep lowercase ones only.
  const bigrams = new Map(
    [...parseCounts(await loadCounts(COUNT_FILES.bigrams))].filter(
      ([phrase]) => phrase === phrase.toLowerCase(),
    ),
  );

  const db = await getDb();
  const existing = db ? await loadExistingRows(db) : [];
  const extraPairs: [string, string][] = [
    ...handWrittenPairs(),
    ...existing.map((row): [string, string] => [row.word_a.toLowerCase(), row.word_b.toLowerCase()]),
  ];

  const candidates = dropInflectedDuplicates(
    buildCandidates(unigrams, bigrams, { ...CANDIDATE_OPTIONS, extraPairs }),
  );
  console.log(`Candidates: ${candidates.length}`, tally(candidates.map((c) => c.form)));

  if (flag("--no-gate")) return;

  // ---------- Gate ----------
  const phraseOf = (c: { word_a: string; word_b: string }) => `${c.word_a} ${c.word_b}`;
  const screen = await runGate("screen", candidates.map(phraseOf), batchLimit);
  const screened = candidates.filter((c) => screen.get(phraseOf(c))?.valid);
  const verdicts = await runGate("strict", screened.map(phraseOf), batchLimit);

  const unjudged =
    candidates.filter((c) => !screen.has(phraseOf(c))).length +
    screened.filter((c) => !verdicts.has(phraseOf(c))).length;
  const accepted = screened.filter((c) => {
    const verdict = verdicts.get(phraseOf(c));
    return verdict?.valid && verdict.familiarity >= MIN_FAMILIARITY;
  });
  const rejected = screened.filter((c) => verdicts.has(phraseOf(c)) && !accepted.includes(c));

  // ---------- Review ----------
  const { applyReview } = await import("../lib/chainlink/lexicon/review");
  const review = existsSync(REVIEW_PATH) ? JSON.parse(readFileSync(REVIEW_PATH, "utf8")) : {};
  const gated = accepted.map((candidate) => {
    const verdict = verdicts.get(phraseOf(candidate))!;
    return { ...candidate, familiarity: verdict.familiarity, category: verdict.category };
  });
  const reviewed = applyReview(gated, review);

  // ---------- Score + output ----------
  const scores = scoreLinks(reviewed);
  const entries: LexiconEntry[] = reviewed
    .map((link, i) => ({
      word_a: link.word_a,
      word_b: link.word_b,
      score: scores[i],
      form: link.form,
      familiarity: link.familiarity,
      category: link.category,
    }))
    .sort((x, y) => x.word_a.localeCompare(y.word_a) || x.word_b.localeCompare(y.word_b));

  mkdirSync("data/chainlink", { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    `[\n${entries.map((entry) => `  ${JSON.stringify(entry)}`).join(",\n")}\n]\n`,
  );

  // ---------- Report ----------
  const outgoing = tally(entries.map((e) => e.word_a));
  const startWords = Object.values(outgoing).filter((n) => n >= 2 && n <= 20).length;
  console.log(
    `\nScreened in ${screened.length} of ${candidates.length}; strict pass kept ${accepted.length} and rejected ${rejected.length}; review removed ${gated.length - reviewed.length}; final ${entries.length}; unjudged ${unjudged}.`,
  );
  console.log("By score:", tally(entries.map((e) => e.score)));
  console.log("By form:", tally(entries.map((e) => e.form)));
  console.log("By familiarity:", tally(entries.map((e) => e.familiarity)));
  console.log(`Distinct first words: ${Object.keys(outgoing).length}, usable start words (2–20 links): ${startWords}`);
  console.log(
    "Sample strict-pass rejects:",
    rejected
      .filter((_, i) => i % Math.max(1, Math.floor(rejected.length / 30)) === 0)
      .map((c) => `${c.word_a} ${c.word_b}`)
      .join(", "),
  );
  console.log(`\nWrote ${OUTPUT_PATH}`);

  if (flag("--write")) {
    if (!db) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    if (unjudged > 0) throw new Error(`${unjudged} candidates are still unjudged; rerun before --write`);
    await writeToDb(db, entries, existing);
  }
}

main().catch((err) => {
  console.error("Lexicon build failed:", err);
  process.exit(1);
});
