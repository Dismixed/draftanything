export type ChainRowOutcome = "start" | "solved" | "missed" | "unreached";

export interface ChainRowSummary {
  word: string;
  outcome: ChainRowOutcome;
  label: string;
}

export interface ChainSummary {
  rows: ChainRowSummary[];
  /** Words solved, not counting the given first word. */
  solved: number;
  /** Words to solve, not counting the given first word. */
  total: number;
  misses: number;
  hints: number;
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : (noun === "miss" ? "es" : "s")}`;

/**
 * How each word in the chain went. A wrong guess and a hint each reveal one letter, so the
 * letters revealed beyond the wrong guesses are the hints.
 */
export function summarizeChain(
  words: readonly string[],
  statuses: readonly string[],
  attempts: readonly (readonly string[] | undefined)[],
  revealed: readonly (readonly boolean[] | undefined)[],
): ChainSummary {
  let solved = 0;
  let misses = 0;
  let hints = 0;

  const rows = words.map((word, i): ChainRowSummary => {
    if (i === 0) return { word, outcome: "start", label: "" };

    const status = statuses[i];
    if (status === "locked") return { word, outcome: "unreached", label: "not reached" };

    const wrong = (attempts[i] ?? []).filter((guess) => normalize(guess) !== normalize(word)).length;
    const helped = Math.max(0, (revealed[i] ?? []).filter(Boolean).length - wrong);
    misses += wrong;
    hints += helped;

    if (status !== "solved") return { word, outcome: "missed", label: "missed" };

    solved++;
    const parts = [wrong > 0 ? count(wrong, "miss") : "", helped > 0 ? count(helped, "hint") : ""].filter(Boolean);
    return { word, outcome: "solved", label: parts.length > 0 ? parts.join(", ") : "first try" };
  });

  return { rows, solved, total: Math.max(0, words.length - 1), misses, hints };
}
