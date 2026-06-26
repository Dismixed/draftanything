import type { Clue, ClientClue, ClientDailyRound } from "./types";

/** Fixed order for daily rounds — one clue type per round. */
export const DAILY_ROUND_CLUE_TYPES = [
  "landmark",
  "written_language",
  "person",
  "food",
  "environment",
] as const;

export type DailyRoundClueType = (typeof DAILY_ROUND_CLUE_TYPES)[number];

export const DAILY_ROUND_COUNT = DAILY_ROUND_CLUE_TYPES.length;
export const DAILY_MAX_ROUND_SCORE = 200;
export const DAILY_MAX_TOTAL_SCORE = DAILY_MAX_ROUND_SCORE * DAILY_ROUND_COUNT;

export const DAILY_CLUE_TYPE_LABEL: Record<DailyRoundClueType, string> = {
  landmark: "Landmark",
  written_language: "Language",
  person: "Person",
  food: "Food",
  environment: "Environment",
};

/**
 * Points decay with geographic distance. Exact match (≤25 km) earns full round score.
 */
export function scoreFromDistanceKm(distanceKm: number): number {
  if (distanceKm <= 25) return DAILY_MAX_ROUND_SCORE;
  return Math.max(
    0,
    Math.round(DAILY_MAX_ROUND_SCORE * Math.exp(-distanceKm / 2500)),
  );
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) return "0 km";
  if (distanceKm < 100) return `${Math.round(distanceKm)} km`;
  return `${Math.round(distanceKm).toLocaleString()} km`;
}

export function dailySessionId(date: string): string {
  return `daily-${date}`;
}

function redactClueForClient(clue: Clue): ClientClue {
  const hideLabel = clue.metadata?.hide_label === true;
  return {
    type: clue.type,
    content: hideLabel ? "" : clue.content,
    metadata: {
      ...clue.metadata,
      source: hideLabel ? undefined : clue.metadata?.source,
      source_url: hideLabel ? undefined : clue.metadata?.source_url,
      label: hideLabel ? undefined : clue.metadata?.label,
      hide_label: undefined,
    },
    difficulty_rank: clue.difficulty_rank,
  };
}

export function buildDailyRound(
  puzzle: { id: string; clues: Clue[] },
  clueType: DailyRoundClueType,
  roundIndex: number,
): ClientDailyRound {
  const source = (puzzle.clues ?? []).find((c) => c.type === clueType);
  if (!source) {
    throw new Error(`Puzzle ${puzzle.id} missing clue type: ${clueType}`);
  }
  return {
    roundIndex,
    puzzleId: puzzle.id,
    clueType,
    clue: redactClueForClient(source),
  };
}

interface DailyPickSource {
  id: string;
  clues: Clue[];
}

/** Deterministically pick N unique puzzles for a daily session. */
export function pickDailyPuzzles<T extends DailyPickSource>(
  approved: T[],
  date: string,
): T[] {
  if (approved.length < DAILY_ROUND_COUNT) {
    throw new Error(
      `Need at least ${DAILY_ROUND_COUNT} approved puzzles for daily mode`,
    );
  }

  const used = new Set<string>();
  const picks: T[] = [];

  for (const clueType of DAILY_ROUND_CLUE_TYPES) {
    let found = false;
    for (let attempt = 0; attempt < approved.length; attempt++) {
      const idx = dateRoundHash(date, clueType, attempt) % approved.length;
      const candidate = approved[idx];
      if (!used.has(candidate.id)) {
        used.add(candidate.id);
        picks.push(candidate);
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(`Could not pick ${DAILY_ROUND_COUNT} unique daily puzzles`);
    }
  }

  return picks;
}

function dateRoundHash(date: string, clueType: string, attempt: number): number {
  let h = 0x811c9dc5;
  const input = `${date}:${clueType}:${attempt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function buildDailyRoundsFromPuzzles(
  puzzles: DailyPickSource[],
): ClientDailyRound[] {
  return DAILY_ROUND_CLUE_TYPES.map((clueType, roundIndex) =>
    buildDailyRound(puzzles[roundIndex], clueType, roundIndex),
  );
}
