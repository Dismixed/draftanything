import type { Clue, ClientDailyRound } from "./types";
import {
  getImageOptions,
  isImageClueType,
  pickImageVariantIndex,
  redactClueForClient,
} from "./clue-images";

/**
 * The most rounds any stored daily has. New days have seven (see lineup.ts);
 * days stored before that change have ten, and are still playable.
 */
export const MAX_DAILY_ROUNDS = 10;
export const DAILY_MAX_ROUND_SCORE = 100;
/** Within this distance, the guess earns full round points. */
export const DAILY_EXACT_MATCH_KM = 75;
/** Larger values decay points more slowly with distance. */
export const DAILY_SCORE_DECAY_KM = 4500;

/**
 * Round headings by clue type. Landmark and environment are one kind of
 * round to the player. Currency and jersey are retired but appear in days
 * stored before that.
 */
export const DAILY_CLUE_TYPE_LABEL: Record<string, string> = {
  flag: "Flag",
  landmark: "Place",
  environment: "Place",
  written_language: "Language",
  person: "Person",
  food: "Food",
  brand: "Brand",
  wildlife: "Wildlife",
  currency: "Currency",
  jersey: "Jersey",
};

/** What a round's fun fact is about, by clue type; the fact describes the clue, not the country. */
export const DAILY_FACT_LABEL: Record<string, string> = {
  flag: "About the flag",
  landmark: "About the place",
  environment: "About the place",
  written_language: "About the language",
  person: "About the person",
  food: "About the dish",
  brand: "About the brand",
  wildlife: "About the animal",
  currency: "About the currency",
  jersey: "About the jersey",
};

/**
 * Points decay with geographic distance. Close guesses (≤75 km) earn full round score.
 */
export function scoreFromDistanceKm(distanceKm: number): number {
  if (distanceKm <= DAILY_EXACT_MATCH_KM) return DAILY_MAX_ROUND_SCORE;
  return Math.max(
    0,
    Math.round(
      DAILY_MAX_ROUND_SCORE * Math.exp(-distanceKm / DAILY_SCORE_DECAY_KM),
    ),
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

/** True when a clue can be shown in daily mode (has image or text as required). */
export function isDailyCluePlayable(
  clueType: string,
  clue: Clue | undefined,
): clue is Clue {
  if (!clue || clue.type !== clueType) return false;

  if (clueType === "written_language") {
    return clue.content.trim().length > 0;
  }

  if (clueType === "currency") {
    return (
      getImageOptions(clue).length > 0 || clue.content.trim().length > 0
    );
  }

  if (isImageClueType(clueType)) {
    return getImageOptions(clue).length > 0;
  }

  return clue.content.trim().length > 0;
}

export function buildDailyRound(
  puzzle: DailyPickSource,
  clueType: string,
  roundIndex: number,
  date: string,
): ClientDailyRound {
  const source = (puzzle.clues ?? []).find((c) => c.type === clueType);
  if (!source) {
    throw new Error(`Puzzle ${puzzle.id} missing clue type: ${clueType}`);
  }
  const variantIndex = pickImageVariantIndex(source, date, puzzle.id);
  return {
    roundIndex,
    puzzleId: puzzle.id,
    clueType,
    clue: redactClueForClient(source, variantIndex),
  };
}

export interface DailyPickSource {
  id: string;
  clues: Clue[];
}
