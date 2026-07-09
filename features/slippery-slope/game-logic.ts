import type { Question } from "@/components/slippery-slope/data";
import { wagerToDiff } from "@/components/slippery-slope/data";

/** Wager used to pick the preview question shown during the wager phase. */
export const PREVIEW_WAGER = 5;

function matchesDifficulty(q: Question, diff: number): boolean {
  if (diff === 4) return q.d >= 3;
  return q.d === diff;
}

export function pickQuestionFromPool(
  pool: Question[],
  wager: number,
  usedIndices: number[],
  seed?: number,
): { question: Question; index: number } | null {
  if (!pool.length) return null;

  const used = new Set(usedIndices);
  const d = wagerToDiff(wager);

  let cands = pool
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => matchesDifficulty(q, d) && !used.has(i));

  if (!cands.length) {
    cands = pool.map((q, i) => ({ q, i })).filter(({ i }) => !used.has(i));
  }

  if (!cands.length) return null;

  const pickIndex =
    seed === undefined
      ? Math.floor(Math.random() * cands.length)
      : ((seed % cands.length) + cands.length) % cands.length;
  const pick = cands[pickIndex];
  return { question: pick.q, index: pick.i };
}

/** Strip correct answer index for active question phase. */
export function sanitizeQuestionForClient(
  question: Question | null,
  turnPhase: "WAGER" | "QUESTION" | null,
): Question | null {
  if (!question) return null;
  if (turnPhase === "QUESTION") {
    const { c: _c, ...rest } = question;
    return rest as Question;
  }
  return question;
}
