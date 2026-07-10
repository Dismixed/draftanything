import type { Clue, ClientDailyRound } from "./types";
import {
  dailyImageUrlForClue,
  getImageOptions,
  isImageClueType,
  pickImageVariantIndex,
  redactClueForClient,
} from "./clue-images";

/** Fixed order for daily rounds — one clue type per round. */
export const DAILY_ROUND_CLUE_TYPES = [
  "flag",
  "currency",
  "jersey",
  "brand",
  "landmark",
  "written_language",
  "person",
  "food",
  "environment",
  "wildlife",
] as const;

export type DailyRoundClueType = (typeof DAILY_ROUND_CLUE_TYPES)[number];

export const DAILY_ROUND_COUNT = DAILY_ROUND_CLUE_TYPES.length;
export const DAILY_MAX_ROUND_SCORE = 100;
export const DAILY_MAX_TOTAL_SCORE = DAILY_MAX_ROUND_SCORE * DAILY_ROUND_COUNT;
/** Within this distance, the guess earns full round points. */
export const DAILY_EXACT_MATCH_KM = 75;
/** Larger values decay points more slowly with distance. */
export const DAILY_SCORE_DECAY_KM = 4500;

export const DAILY_CLUE_TYPE_LABEL: Record<DailyRoundClueType, string> = {
  flag: "Flag",
  currency: "Currency",
  jersey: "Jersey",
  brand: "Brand",
  landmark: "Landmark",
  written_language: "Language",
  person: "Person",
  food: "Food",
  environment: "Environment",
  wildlife: "Wildlife",
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
  clueType: DailyRoundClueType,
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

/** True when the approved pool can assign a playable clue to every daily round. */
export function canFillDailyRounds<T extends DailyPickSource>(
  approved: T[],
): boolean {
  if (approved.length < DAILY_ROUND_COUNT) return false;

  return DAILY_ROUND_CLUE_TYPES.every((clueType) =>
    approved.some((puzzle) =>
      isDailyCluePlayable(
        clueType,
        puzzle.clues?.find((c) => c.type === clueType),
      ),
    ),
  );
}

export function buildDailyRound(
  puzzle: DailyPickSource,
  clueType: DailyRoundClueType,
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

interface DailyPickSource {
  id: string;
  clues: Clue[];
}

export interface DailyPickOptions {
  /** Puzzle ids already used on recent daily sessions — skipped when possible. */
  excludeIds?: Set<string>;
  /** Per-round clue text already shown recently — avoids repeats like "Hallo". */
  excludeClueContents?: Map<string, Set<string>>;
  /** Per-round image URLs already shown recently. */
  excludeImageUrls?: Map<string, Set<string>>;
}

/** Max prior days to exclude when the pool can still fill every round. */
export function maxDailyLookbackDays(poolSize: number): number {
  if (poolSize <= DAILY_ROUND_COUNT) return 0;
  return Math.floor((poolSize - DAILY_ROUND_COUNT) / DAILY_ROUND_COUNT);
}

function parseDateUTC(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function clueContentForType(puzzle: DailyPickSource, clueType: string): string {
  return (puzzle.clues ?? []).find((c) => c.type === clueType)?.content ?? "";
}

function normalizeClueContent(content: string): string {
  return content.trim().toLowerCase();
}

/** Collect puzzle ids used on prior daily sessions within the lookback window. */
export function collectRecentDailyPuzzleIds<T extends DailyPickSource>(
  approved: T[],
  date: string,
  lookbackDays: number,
): Set<string> {
  const recent = new Set<string>();
  if (lookbackDays <= 0) return recent;

  const base = parseDateUTC(date);
  for (let offset = 1; offset <= lookbackDays; offset++) {
    const prevDate = formatDateUTC(addDaysUTC(base, -offset));
    for (const puzzle of pickDailyPuzzlesBare(approved, prevDate)) {
      recent.add(puzzle.id);
    }
  }
  return recent;
}

/** Collect clue text shown on prior daily sessions, grouped by round clue type. */
export function collectRecentClueContents<T extends DailyPickSource>(
  approved: T[],
  date: string,
  lookbackDays: number,
): Map<string, Set<string>> {
  const contents = new Map<string, Set<string>>();
  for (const clueType of DAILY_ROUND_CLUE_TYPES) {
    contents.set(clueType, new Set());
  }
  if (lookbackDays <= 0) return contents;

  const base = parseDateUTC(date);
  for (let offset = 1; offset <= lookbackDays; offset++) {
    const prevDate = formatDateUTC(addDaysUTC(base, -offset));
    const picks = pickDailyPuzzlesBare(approved, prevDate);
    for (let i = 0; i < DAILY_ROUND_CLUE_TYPES.length; i++) {
      const clueType = DAILY_ROUND_CLUE_TYPES[i];
      // Flag clues all share the same internal label ("national flag") — dedupe by image URL instead.
      if (clueType === "flag") continue;
      const content = clueContentForType(picks[i], clueType);
      if (content) {
        contents.get(clueType)!.add(normalizeClueContent(content));
      }
    }
  }
  return contents;
}

/** Collect image URLs shown on prior daily sessions, grouped by round clue type. */
export function collectRecentImageUrls<T extends DailyPickSource>(
  approved: T[],
  date: string,
  lookbackDays: number,
): Map<string, Set<string>> {
  const urls = new Map<string, Set<string>>();
  for (const clueType of DAILY_ROUND_CLUE_TYPES) {
    urls.set(clueType, new Set());
  }
  if (lookbackDays <= 0) return urls;

  const base = parseDateUTC(date);
  for (let offset = 1; offset <= lookbackDays; offset++) {
    const prevDate = formatDateUTC(addDaysUTC(base, -offset));
    const picks = pickDailyPuzzlesBare(approved, prevDate);
    for (let i = 0; i < DAILY_ROUND_CLUE_TYPES.length; i++) {
      const clueType = DAILY_ROUND_CLUE_TYPES[i];
      if (!isImageClueType(clueType)) continue;
      const clue = picks[i].clues.find((entry) => entry.type === clueType);
      if (!clue) continue;
      const imageUrl = dailyImageUrlForClue(clue, picks[i].id, prevDate);
      if (imageUrl) {
        urls.get(clueType)!.add(imageUrl);
      }
    }
  }
  return urls;
}

function resolveDailyPickOptions<T extends DailyPickSource>(
  approved: T[],
  date: string,
  options?: DailyPickOptions,
): DailyPickOptions | undefined {
  if (options !== undefined) return options;
  const lookbackDays = maxDailyLookbackDays(approved.length);
  if (lookbackDays <= 0) return undefined;
  return {
    excludeIds: collectRecentDailyPuzzleIds(approved, date, lookbackDays),
    excludeClueContents: collectRecentClueContents(approved, date, lookbackDays),
    excludeImageUrls: collectRecentImageUrls(approved, date, lookbackDays),
  };
}

function isExcludedCandidate(
  candidate: DailyPickSource,
  clueType: DailyRoundClueType,
  date: string,
  usedIds: Set<string>,
  usedContentsByType: Map<string, Set<string>>,
  options?: DailyPickOptions,
): boolean {
  if (usedIds.has(candidate.id)) return true;
  if (options?.excludeIds?.has(candidate.id)) return true;

  const clue = candidate.clues.find((entry) => entry.type === clueType);
  if (!isDailyCluePlayable(clueType, clue)) return true;

  const content = clue.content;
  if (content && clueType !== "flag") {
    const normalized = normalizeClueContent(content);
    if (options?.excludeClueContents?.get(clueType)?.has(normalized)) return true;
    if (usedContentsByType.get(clueType)?.has(normalized)) return true;
  }

  if (isImageClueType(clueType)) {
    const imageUrl = dailyImageUrlForClue(clue, candidate.id, date);
    if (imageUrl && options?.excludeImageUrls?.get(clueType)?.has(imageUrl)) {
      return true;
    }
  }

  return false;
}

function pickDailyPuzzlesBare<T extends DailyPickSource>(
  approved: T[],
  date: string,
  options?: DailyPickOptions,
): T[] {
  if (approved.length < DAILY_ROUND_COUNT) {
    throw new Error(
      `Need at least ${DAILY_ROUND_COUNT} approved puzzles for daily mode`,
    );
  }

  const usedIds = new Set<string>();
  const usedContentsByType = new Map<string, Set<string>>();
  for (const clueType of DAILY_ROUND_CLUE_TYPES) {
    usedContentsByType.set(clueType, new Set());
  }
  const picks: T[] = [];

  for (const clueType of DAILY_ROUND_CLUE_TYPES) {
    const candidate = pickCandidateForRound(
      approved,
      date,
      clueType,
      usedIds,
      usedContentsByType,
      options,
    );
    if (!candidate) {
      throw new Error(`Could not pick ${DAILY_ROUND_COUNT} unique daily puzzles`);
    }

    usedIds.add(candidate.id);
    const content = clueContentForType(candidate, clueType);
    if (content && clueType !== "flag") {
      usedContentsByType
        .get(clueType)!
        .add(normalizeClueContent(content));
    }
    picks.push(candidate);
  }

  return picks;
}

function pickCandidateForRound<T extends DailyPickSource>(
  approved: T[],
  date: string,
  clueType: DailyRoundClueType,
  usedIds: Set<string>,
  usedContentsByType: Map<string, Set<string>>,
  options?: DailyPickOptions,
): T | null {
  const tryPick = (pool: T[]) => {
    for (const candidate of pool) {
      if (
        !isExcludedCandidate(
          candidate,
          clueType,
          date,
          usedIds,
          usedContentsByType,
          options,
        )
      ) {
        return candidate;
      }
    }
    return null;
  };

  const hashedPool = Array.from({ length: approved.length }, (_, attempt) => {
    const idx = dateRoundHash(date, clueType, attempt) % approved.length;
    return approved[idx];
  });
  const seen = new Set<string>();
  const ordered = hashedPool.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
  for (const candidate of approved) {
    if (!seen.has(candidate.id)) ordered.push(candidate);
  }

  return tryPick(ordered);
}

/** Deterministically pick N unique puzzles for a daily session. */
export function pickDailyPuzzles<T extends DailyPickSource>(
  approved: T[],
  date: string,
  options?: DailyPickOptions,
): T[] {
  const resolved =
    options !== undefined
      ? options
      : resolveDailyPickOptions(approved, date, options);

  try {
    return pickDailyPuzzlesBare(approved, date, resolved);
  } catch (err) {
    if (!resolved) throw err;
    try {
      return pickDailyPuzzlesBare(approved, date, {
        excludeIds: resolved.excludeIds,
      });
    } catch {
      return pickDailyPuzzlesBare(approved, date, undefined);
    }
  }
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
  date: string,
): ClientDailyRound[] {
  return DAILY_ROUND_CLUE_TYPES.map((clueType, roundIndex) =>
    buildDailyRound(puzzles[roundIndex], clueType, roundIndex, date),
  );
}
