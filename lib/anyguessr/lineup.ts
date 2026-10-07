/**
 * Picks the clues for one day's AnyGuessr game from the approved pool.
 *
 * A game is seven rounds, each a different country. Round one is a flag;
 * the other six are drawn from whichever clues are approved, so a brand or
 * wildlife round appears only when a good one comes up. Every day follows
 * the same difficulty curve, which keeps scores comparable between days.
 */

export type LineupDifficulty = "easy" | "medium" | "hard";

export interface LineupClue {
  /** The country's puzzle id; one puzzle per country. */
  puzzleId: string;
  clueType: string;
  difficulty: LineupDifficulty;
}

/** A day that has already been played, for avoiding repeats. */
export interface LineupDay {
  date: string;
  rounds: ReadonlyArray<{ puzzleId: string; clueType: string }>;
}

export const LINEUP_ROUNDS = 7;

/** Difficulty of the six rounds after the flag, which counts as the second easy round. */
const CURVE: LineupDifficulty[] = ["easy", "medium", "medium", "medium", "hard", "hard"];

/** Where to look when the pool has no clue of the wanted difficulty. */
const FALLBACK: Record<LineupDifficulty, LineupDifficulty[]> = {
  easy: ["easy", "medium", "hard"],
  medium: ["medium", "easy", "hard"],
  hard: ["hard", "medium", "easy"],
};

/** Landmark and environment are both shown to players as "Place". */
const GROUP: Record<string, string> = { landmark: "place", environment: "place" };

/** Most rounds one kind of clue may take in a game. */
const GROUP_LIMIT: Record<string, number> = { place: 3 };
const DEFAULT_GROUP_LIMIT = 2;

/** Clue types the game draws from. Currency and jersey are retired. */
const ROUND_TYPES = new Set(["landmark", "environment", "food", "person", "brand", "wildlife", "written_language"]);

const groupOf = (clueType: string) => GROUP[clueType] ?? clueType;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Seven rounds for `date`, or null when the pool cannot fill a game.
 * `history` is what earlier days actually showed.
 *
 * Countries and clues not seen recently are preferred, with a hash of the
 * date as the tie-break, so the result is the same however often it is
 * computed. Difficulty and type limits give way before the round count does:
 * a thin pool produces an easier or samier game, never a short one.
 */
export function pickLineup(
  pool: readonly LineupClue[],
  date: string,
  history: readonly LineupDay[],
): LineupClue[] | null {
  // Most recent date each country and each clue was shown; "" means never.
  const countrySeen = new Map<string, string>();
  const clueSeen = new Map<string, string>();
  for (const day of history) {
    if (day.date >= date) continue;
    for (const round of day.rounds) {
      if ((countrySeen.get(round.puzzleId) ?? "") < day.date) countrySeen.set(round.puzzleId, day.date);
      const key = `${round.puzzleId}:${round.clueType}`;
      if ((clueSeen.get(key) ?? "") < day.date) clueSeen.set(key, day.date);
    }
  }

  /** Least recently seen country first, then least recently seen clue, then a stable shuffle. */
  const byFreshness = (a: LineupClue, b: LineupClue) => {
    const country = (countrySeen.get(a.puzzleId) ?? "").localeCompare(countrySeen.get(b.puzzleId) ?? "");
    if (country !== 0) return country;
    const clue = (clueSeen.get(`${a.puzzleId}:${a.clueType}`) ?? "").localeCompare(
      clueSeen.get(`${b.puzzleId}:${b.clueType}`) ?? "",
    );
    if (clue !== 0) return clue;
    return hash(`${date}:${a.puzzleId}:${a.clueType}`) - hash(`${date}:${b.puzzleId}:${b.clueType}`);
  };

  const flags = pool.filter((c) => c.clueType === "flag").sort(byFreshness);
  const others = pool.filter((c) => ROUND_TYPES.has(c.clueType)).sort(byFreshness);

  const usedCountries = new Set<string>();
  const groupCounts = new Map<string, number>();
  const picked: LineupClue[] = [];

  const take = (clue: LineupClue) => {
    picked.push(clue);
    usedCountries.add(clue.puzzleId);
    const group = groupOf(clue.clueType);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
  };

  const underLimit = (clue: LineupClue) => {
    const group = groupOf(clue.clueType);
    return (groupCounts.get(group) ?? 0) < (GROUP_LIMIT[group] ?? DEFAULT_GROUP_LIMIT);
  };

  for (const wanted of CURVE) {
    const free = others.filter((c) => !usedCountries.has(c.puzzleId));
    const choice =
      // First the wanted difficulty within the type limits, then other
      // difficulties, and only then more of a type than usual.
      FALLBACK[wanted].map((level) => free.find((c) => c.difficulty === level && underLimit(c))).find(Boolean) ??
      FALLBACK[wanted].map((level) => free.find((c) => c.difficulty === level)).find(Boolean);
    if (!choice) return null;
    take(choice);
  }

  const flag = flags.find((c) => !usedCountries.has(c.puzzleId));
  if (!flag) return null;

  const order: Record<LineupDifficulty, number> = { easy: 0, medium: 1, hard: 2 };
  return [flag, ...picked.sort((a, b) => order[a.difficulty] - order[b.difficulty])];
}
