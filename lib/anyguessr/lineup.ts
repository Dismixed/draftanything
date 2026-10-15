/**
 * Picks the clues for one day's AnyGuessr game from the approved pool.
 *
 * A game is seven rounds, each a different country. Round one is a flag;
 * the other six are drawn from whichever clues are approved, mixing the
 * kinds of clue as widely as the pool allows. How hard a day is depends on
 * what comes up; the rounds are shown easiest first.
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

/** Most rounds one kind of clue may take in a game. */
const TYPE_LIMIT = 2;

/** A country shown within this many days is passed over while any other can fill the round. */
const COUNTRY_REST_DAYS = 7;

/** Clue types the game draws from. Currency and jersey are retired. */
const ROUND_TYPES = new Set([
  "landmark",
  "environment",
  "food",
  "person",
  "brand",
  "wildlife",
  "written_language",
  "traditional_dress",
  "satellite",
  "street",
  "road_sign",
]);

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
 * computed. Each round goes to the kind of clue the game has least of so
 * far and, among those, the kind shown least in the last week, so a new or
 * rarely drawn kind comes up soon. A country shown in the last week is used only when nothing else is
 * left: the type limits give way first, so one scarce clue cannot appear day
 * after day. Both give way before the round count does: a thin pool produces
 * a samier game, never a short one.
 */
export function pickLineup(
  pool: readonly LineupClue[],
  date: string,
  history: readonly LineupDay[],
): LineupClue[] | null {
  const restedSince = new Date(`${date}T12:00:00Z`);
  restedSince.setUTCDate(restedSince.getUTCDate() - COUNTRY_REST_DAYS);
  const restCutoff = restedSince.toISOString().slice(0, 10);

  // Most recent date each country and each clue was shown; "" means never.
  const countrySeen = new Map<string, string>();
  const clueSeen = new Map<string, string>();
  // How many rounds of each kind the last week showed.
  const typeShown = new Map<string, number>();
  for (const day of history) {
    if (day.date >= date) continue;
    for (const round of day.rounds) {
      if ((countrySeen.get(round.puzzleId) ?? "") < day.date) countrySeen.set(round.puzzleId, day.date);
      const key = `${round.puzzleId}:${round.clueType}`;
      if ((clueSeen.get(key) ?? "") < day.date) clueSeen.set(key, day.date);
      if (day.date >= restCutoff) typeShown.set(round.clueType, (typeShown.get(round.clueType) ?? 0) + 1);
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

  const rested = (clue: LineupClue) => (countrySeen.get(clue.puzzleId) ?? "") < restCutoff;

  const flags = pool.filter((c) => c.clueType === "flag").sort(byFreshness);
  const others = pool.filter((c) => ROUND_TYPES.has(c.clueType)).sort(byFreshness);

  const usedCountries = new Set<string>();
  const typeCounts = new Map<string, number>();
  const picked: LineupClue[] = [];

  const take = (clue: LineupClue) => {
    picked.push(clue);
    usedCountries.add(clue.puzzleId);
    typeCounts.set(clue.clueType, (typeCounts.get(clue.clueType) ?? 0) + 1);
  };

  const typeCount = (clue: LineupClue) => typeCounts.get(clue.clueType) ?? 0;

  const underLimit = (clue: LineupClue) => typeCount(clue) < TYPE_LIMIT;

  const shown = (clue: LineupClue) => typeShown.get(clue.clueType) ?? 0;

  /** Fewer in this game first, then fewer in the last week. Ties keep the fresher clue. */
  const needier = (a: LineupClue, b: LineupClue) => typeCount(a) - typeCount(b) || shown(a) - shown(b);

  /** The freshest clue of whichever kind this game, then the last week, has least of. */
  const mostNeeded = (from: LineupClue[]) =>
    from.reduce<LineupClue | undefined>((best, clue) => (best && needier(best, clue) <= 0 ? best : clue), undefined);

  for (let round = 1; round < LINEUP_ROUNDS; round++) {
    const free = others.filter((c) => !usedCountries.has(c.puzzleId));
    const fresh = free.filter(rested);
    const choice =
      // Within the type limits, then more of a type than usual, and only
      // then a country from the last week.
      mostNeeded(fresh.filter(underLimit)) ??
      mostNeeded(fresh) ??
      mostNeeded(free.filter(underLimit)) ??
      mostNeeded(free);
    if (!choice) return null;
    take(choice);
  }

  const flag = flags.find((c) => !usedCountries.has(c.puzzleId));
  if (!flag) return null;

  const order: Record<LineupDifficulty, number> = { easy: 0, medium: 1, hard: 2 };
  return [flag, ...picked.sort((a, b) => order[a.difficulty] - order[b.difficulty])];
}
