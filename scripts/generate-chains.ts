#!/usr/bin/env tsx
/**
 * scripts/generate-chains.ts
 *
 * Generates candidate Chain Link puzzles — 5-word chains where each
 * consecutive pair forms a common compound word or phrase — then runs
 * them through the full candidate pipeline:
 *
 *   1. Generate   — Datamuse bigram data (default) or the LLM (`--source=llm`)
 *   2. Ambiguity  — reject pairs where a rival word shares the intended
 *                   word's first letter + length and scores at least as high
 *   3. Real word  — reject chains containing non-dictionary words
 *                   (mainly guards LLM-generated output)
 *   4. Semantic   — LLM validation pass (NOT optional before writing): each
 *                   consecutive pair must read as a real compound/phrase
 *   5. Novelty    — reject chains that already exist in chain_puzzles, or
 *                   that break the shared chain rules (lexicon ambiguity,
 *                   particle limit, links used in recent dailies)
 *   6. Insert     — write survivors as `draft` (unapproved) rows so a human
 *                   can review + approve them in the admin panel
 *
 * By default this only generates + reports. Nothing is written to the DB
 * unless you pass `--write`, and nothing is written without the LLM
 * semantic pass (see `--write` below).
 *
 * Usage:
 *   npx tsx scripts/generate-chains.ts                          # dry run: generate + report
 *   npx tsx scripts/generate-chains.ts --validate               # + LLM semantic pass
 *   npx tsx scripts/generate-chains.ts --write                  # + novelty + insert as draft
 *   npx tsx scripts/generate-chains.ts --source=llm             # LLM generates (then re-checked)
 *   npx tsx scripts/generate-chains.ts --seeds=apple,morning    # custom seed words
 */

import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local" });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

type DatamuseWord = { word: string; score: number };

const CACHE = new Map<string, DatamuseWord[]>();

// Datamuse scores aren't documented as a normalized/absolute scale —
// they're only guaranteed to rank results within one query. Treat this
// threshold as a starting guess and tune it empirically once you can
// see real score distributions for your seed vocabulary.
const MIN_BIGRAM_SCORE = 1000;

const DEFAULT_SEEDS = [
  "apple",
  "morning",
  "sun",
  "fire",
  "sea",
  "book",
  "night",
  "moon",
];

/** Words that commonly FOLLOW `word` (e.g. "apple" -> "juice", "pie", "sauce"). */
async function followers(word: string, max = 30): Promise<DatamuseWord[]> {
  return fetchRel("bga", word, max);
}

async function fetchRel(
  code: "bga" | "bgb",
  word: string,
  max: number
): Promise<DatamuseWord[]> {
  const key = `${code}:${word}`;
  if (CACHE.has(key)) return CACHE.get(key)!;

  const url = `https://api.datamuse.com/words?rel_${code}=${encodeURIComponent(
    word
  )}&max=${max}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Datamuse ${code} lookup failed for "${word}": ${res.status}`);
  }
  const data = (await res.json()) as DatamuseWord[];

  // Single words only — multiword results ("hot dog") break the
  // letter-slot UI, which expects one word per row.
  const filtered = data.filter((d) => !d.word.includes(" ") && /^[a-z]+$/i.test(d.word));
  CACHE.set(key, filtered);
  return filtered;
}

type Chain = string[];

/**
 * Random search with backtracking. From `start`, tries to build a
 * chain of `length` unique words where each consecutive pair is a
 * frequent bigram per Datamuse.
 */
async function generateChain(
  start: string,
  length = 5,
  usedGlobally: Set<string> = new Set()
): Promise<Chain | null> {
  async function extend(chain: Chain, used: Set<string>): Promise<Chain | null> {
    if (chain.length === length) return chain;

    const last = chain[chain.length - 1];
    const candidates = await followers(last);
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);

    for (const cand of shuffled) {
      const word = cand.word.toLowerCase();
      if (cand.score < MIN_BIGRAM_SCORE) continue;
      if (used.has(word) || usedGlobally.has(word)) continue;

      const nextChain = [...chain, word];
      const nextUsed = new Set(used).add(word);
      const result = await extend(nextChain, nextUsed);
      if (result) return result;
    }
    return null;
  }

  return extend([start.toLowerCase()], new Set([start.toLowerCase()]));
}

/**
 * The guess-checker only accepts an exact match to the stored word —
 * there's no partial credit for "also valid." That makes ambiguity a
 * hard defect, not a nice-to-flag.
 *
 * But the UI reveals the first letter and total length *before* any
 * guess, so a plain "is this the #1 most common follower" check is
 * too strict — a rival with a different length or first letter is
 * already ruled out for the player just by looking at the row. The
 * actual failure mode is a rival with the SAME first letter and SAME
 * length that's just as common: a player can land on it, have every
 * reason to believe they're right, and still get marked wrong.
 *
 * Returns hard-reject reasons, not soft notes — treat any non-empty
 * result as "fix or discard this chain."
 */
async function ambiguityReport(chain: Chain): Promise<string[]> {
  const problems: string[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const [a, b] = [chain[i], chain[i + 1]];
    const alts = await followers(a, 50);
    const intended = alts.find((x) => x.word === b);
    const intendedScore = intended?.score ?? 0;

    const sameShape = alts.filter(
      (x) => x.word !== b && x.word[0] === b[0] && x.word.length === b.length
    );
    const rival = sameShape.find((x) => x.score >= intendedScore);

    if (rival) {
      problems.push(
        `"${a} ${b}": "${rival.word}" shares ${b}'s first letter and length and scores ${rival.score} vs ${intendedScore} — a player could type it and be wrongly marked wrong. Reject or replace this pair.`
      );
    }
  }
  return problems;
}

/**
 * Real-word check via Datamuse's "spelled like" endpoint. Heuristic:
 * if the exact lowercase word doesn't come back from a spelling lookup,
 * it's probably not a dictionary word. Fails open on API errors so a
 * transient network problem doesn't discard otherwise-fine candidates.
 */
async function isRealWord(word: string): Promise<boolean> {
  const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(
    word
  )}&max=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return true;
    const data = (await res.json()) as DatamuseWord[];
    return data.some((d) => d.word.toLowerCase() === word.toLowerCase());
  } catch {
    return true;
  }
}

/** Sums the intended bigram scores for a chain (for draft ordering). */
async function scoreChain(chain: Chain): Promise<number> {
  let total = 0;
  for (let i = 0; i < chain.length - 1; i++) {
    const alts = await followers(chain[i], 50);
    const intended = alts.find((x) => x.word === chain[i + 1]);
    total += intended?.score ?? 0;
  }
  return total;
}

function phrasesFor(chain: Chain): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    phrases.push(`${chain[i]} ${chain[i + 1]}`);
  }
  return phrases;
}

/* ------------------------------------------------------------------ */
/*  Candidate shape                                                    */
/* ------------------------------------------------------------------ */

type CandidateStatus =
  | "ok"
  | "no-chain-found"
  | "rejected";

/** Draft-puzzle shape matching lib/chainlink/generator.ts's CandidateChain. */
interface DraftChain {
  words: string[];
  phrases: string[];
  difficulty: "easy" | "medium" | "hard";
  theme: string | null;
  score: number;
}

interface Candidate {
  start: string;
  chain: Chain | null;
  status: CandidateStatus;
  problems: string[];
  difficulty?: "easy" | "medium" | "hard";
  score?: number;
  llm?: { difficulty: number; notes: string } | null;
  inserted?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.includes(name);
  const flagValue = (name: string): string | undefined => {
    const match = args.find((a) => a.startsWith(`${name}=`));
    return match ? match.split("=").slice(1).join("=") : undefined;
  };

  const shouldWrite = flag("--write");
  const shouldValidate = shouldWrite || flag("--validate");
  const source = flagValue("--source") ?? "datamuse";
  const seeds = (flagValue("--seeds") ?? DEFAULT_SEEDS.join(","))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // ---------- Phase 1: generate ----------
  const candidates: Candidate[] = [];

  if (source === "llm") {
    const { proposeChainsWithLlm } = await import("../lib/chainlink/llm-validate");
    const proposed = await proposeChainsWithLlm(seeds, { length: 5, perSeed: 2 });
    for (const words of proposed) {
      candidates.push({
        start: words[0] ?? "",
        chain: words,
        status: "ok",
        problems: [],
      });
    }
  } else {
    for (const seed of seeds) {
      const chain = await generateChain(seed);
      if (!chain) {
        candidates.push({ start: seed, chain: null, status: "no-chain-found", problems: [] });
        continue;
      }
      candidates.push({ start: seed, chain, status: "ok", problems: [] });
    }
  }

  // ---------- Phase 2: ambiguity + real-word checks ----------
  for (const candidate of candidates) {
    if (!candidate.chain) continue;

    const problems = await ambiguityReport(candidate.chain);

    for (const word of candidate.chain) {
      if (!(await isRealWord(word))) {
        problems.push(`"${word}" doesn't appear to be a real English word.`);
      }
    }

    if (problems.length > 0) {
      candidate.problems.push(...problems);
      candidate.status = "rejected";
    }
  }

  // ---------- Phase 3: LLM semantic validation ----------
  if (shouldValidate) {
    if (!process.env.GEMINI_API_KEY) {
      console.warn(
        "GEMINI_API_KEY not set — skipping the LLM semantic validation pass.\n" +
          "This pass is NOT optional before writing; `--write` requires it.\n",
      );
    } else {
      const { validateChainWithLlm, difficultyFromRating } = await import(
        "../lib/chainlink/llm-validate"
      );

      for (const candidate of candidates) {
        if (candidate.status !== "ok" || !candidate.chain) continue;

        const validation = await validateChainWithLlm(candidate.chain);
        candidate.llm = {
          difficulty: validation.difficulty,
          notes: validation.notes,
        };

        if (!validation.allValid) {
          candidate.status = "rejected";
          for (const pair of validation.invalidPairs) {
            candidate.problems.push(`LLM flagged "${pair.phrase}": ${pair.reason}`);
          }
        } else {
          candidate.difficulty = difficultyFromRating(validation.difficulty);
        }
      }
    }
  }

  // ---------- Phase 4: novelty check + insert drafts ----------
  if (shouldWrite) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "Refusing to write without the LLM semantic pass — set GEMINI_API_KEY and re-run.",
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --write.",
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const { loadExistingChainIndex, checkNoveltyAgainstIndex } = await import(
      "../lib/chainlink/novelty"
    );
    const { saveDraftChains, loadChainRules } = await import("../lib/chainlink/generator");
    const { chainProblems } = await import("../lib/chainlink/chain-rules");

    const db = createClient(url!, key!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const index = await loadExistingChainIndex(db);
    const rules = await loadChainRules(db);
    const toInsert: DraftChain[] = [];

    for (const candidate of candidates) {
      if (candidate.status !== "ok" || !candidate.chain) continue;

      const novelty = checkNoveltyAgainstIndex(index, candidate.chain);
      // Same lexicon-based rules the phrase-graph generator applies.
      const problems = [...novelty.problems, ...chainProblems(candidate.chain, rules)];
      if (problems.length > 0) {
        candidate.problems.push(...problems);
        candidate.status = "rejected";
        continue;
      }

      toInsert.push({
        words: candidate.chain,
        phrases: phrasesFor(candidate.chain),
        difficulty: candidate.difficulty ?? "medium",
        theme: null,
        score: candidate.score ?? (await scoreChain(candidate.chain)),
      });
    }

    if (toInsert.length > 0) {
      const saved = await saveDraftChains(db, toInsert, "generate-chains");
      console.log(`Inserted ${saved} draft puzzle(s).`);
      // Mark inserted so the summary reflects it.
      for (const candidate of candidates) {
        if (candidate.status === "ok" && candidate.chain) {
          candidate.inserted = true;
        }
      }
    }
  }

  // ---------- Report ----------
  console.log(JSON.stringify(candidates, null, 2));
  const ok = candidates.filter((c) => c.status === "ok").length;
  console.log(
    `\n${ok}/${candidates.length} passed the checks` +
      (shouldValidate ? " (including the LLM semantic pass)" : " (bigram-level only)") +
      ` — treat survivors as candidates, not approved puzzles.`,
  );
}

main().catch((err) => {
  console.error("Generate failed:", err);
  process.exit(1);
});
