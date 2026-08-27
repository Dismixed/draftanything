import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  generateChains,
  saveDraftChains,
  type CandidateChain,
} from "@/lib/chainlink/generator";
import {
  checkNoveltyAgainstIndex,
  loadExistingChainIndex,
} from "@/lib/chainlink/novelty";
import { mapPool } from "@/lib/anyguessr/async-pool";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeChainKey(words: string[]): string {
  return words.map((w) => w.trim().toLowerCase()).join("|");
}

/** Drop exact-duplicate chains (same word sequence, case-insensitive). */
function dedupeChains(chains: CandidateChain[]): CandidateChain[] {
  const seen = new Set<string>();
  const out: CandidateChain[] = [];
  for (const chain of chains) {
    const key = normalizeChainKey(chain.words);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chain);
  }
  return out;
}

function toCandidateChain(words: string[]): CandidateChain {
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }
  return { words, phrases, difficulty: "medium", theme: null, score: 24 };
}

// Seed words for the LLM supplement when the phrase graph runs dry.
const LLM_SEEDS = [
  "coffee", "mountain", "computer", "garden", "phone", "winter",
  "street", "cheese", "music", "beach", "kitchen", "table",
];

/* ------------------------------------------------------------------ */
/*  Route                                                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let body: {
      count?: number;
      difficulty?: "easy" | "medium" | "hard";
      category?: string;
      validate?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const db = createAdminClient();
    const count = body.count ?? 25;

    // 1. Graph generation from the curated phrase table.
    let allChains = await generateChains(db, {
      length: 5,
      difficulty: body.difficulty,
      category: body.category,
      count,
    });

    // 2. The phrase graph is small (a few branch points), so it often can't
    //    produce `count` novel chains on its own — top it up with LLM-proposed
    //    chains, then dedupe everything.
    if (allChains.length < count) {
      try {
        const { proposeChainsWithLlm } = await import(
          "@/lib/chainlink/llm-validate"
        );
        const proposals = await proposeChainsWithLlm(LLM_SEEDS, {
          length: 5,
          perSeed: 2,
        });
        const extra = proposals
          .filter((words) => words.length === 5)
          .map(toCandidateChain);
        allChains = dedupeChains([...allChains, ...extra]);
      } catch (err) {
        console.error("LLM supplement failed:", err);
      }
    }

    allChains = dedupeChains(allChains).slice(0, count);

    // 3. Novelty filter — never save a chain that already exists in
    //    chain_puzzles (reusing individual words is fine).
    const index = await loadExistingChainIndex(db);
    let kept = allChains.filter(
      (chain) => checkNoveltyAgainstIndex(index, chain.words).problems.length === 0,
    );
    const noveltyDropped = allChains.length - kept.length;

    // 4. Opt-in LLM semantic pass — exact-match scoring makes a non-phrase
    //    pair unsolvable, so this is a hard gate, not a suggestion.
    if (body.validate) {
      const { validateChainWithLlm, difficultyFromRating, scoreFromRating } =
        await import("@/lib/chainlink/llm-validate");
      const validated = await mapPool(kept, 4, async (chain) => {
        const result = await validateChainWithLlm(chain.words);
        return result.allValid
          ? {
              ...chain,
              difficulty: difficultyFromRating(result.difficulty),
              score: scoreFromRating(result.difficulty),
            }
          : null;
      });
      kept = validated.filter(
        (chain): chain is NonNullable<typeof chain> => chain !== null,
      );
    }

    const saved = await saveDraftChains(db, kept, admin.email);

    return NextResponse.json({
      generated: allChains.length,
      noveltyDropped,
      saved,
      chains: kept.map((c) => ({
        words: c.words,
        phrases: c.phrases,
        difficulty: c.difficulty,
        score: c.score,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to generate chains:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
