import type { Clue, ClientClue } from "./types";

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

export interface ClientDailyRound {
  roundIndex: number;
  clueType: DailyRoundClueType;
  clue: ClientClue;
}

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

export function buildDailyRounds(clues: Clue[]): ClientDailyRound[] {
  const byType = new Map<string, Clue>();
  for (const clue of clues) {
    if (!byType.has(clue.type)) byType.set(clue.type, clue);
  }

  return DAILY_ROUND_CLUE_TYPES.map((clueType, roundIndex) => {
    const source = byType.get(clueType);
    if (!source) {
      throw new Error(`Daily puzzle missing clue type: ${clueType}`);
    }
    return {
      roundIndex,
      clueType,
      clue: redactClueForClient(source),
    };
  });
}
