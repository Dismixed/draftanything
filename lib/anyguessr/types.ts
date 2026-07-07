/**
 * AnyGuessr shared types.
 *
 * Clue types are intentionally open-string — the engine never hard-codes a clue
 * ordering or kind. New clue types can be added without touching the store,
 * the schema, or the API; only the renderer must learn to draw them.
 */

/* ------------------------------------------------------------------ */
/*  Answer / Puzzle                                                     */
/* ------------------------------------------------------------------ */

/**
 * The kind of thing the player is being asked to identify.
 * `country` ships first; the schema + service are answer-agnostic so future
 * variants (city / state / landmark / culture / language) reuse the same engine.
 */
export type AnswerType =
  | "country"
  | "city"
  | "state"
  | "landmark"
  | "culture"
  | "language";

export type GameMode = "daily";
export type PuzzleStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

/**
 * Generic clue. The shape is fixed; `type` selects the renderer.
 *  - image clues put a URL in `metadata.image_url` (optionally `thumb_url`)
 *    and a human label in `content` (rendered as alt / caption if requested)
 *  - audio clues put a URL in `metadata.audio_url`
 *  - text clues put the raw display payload in `content`
 *
 * `type` is a free string so callers can add new clue kinds without recompiling
 * the engine — renderers unknown to the client fall back to displaying the
 * `content` text.
 */
export interface Clue {
  /** Renderer hint. e.g. "environment" | "person" | "food" | "written_language" | "landmark" | "audio" | "currency" | "flag_fragment" */
  type: string;
  /** Display payload (text or alt-text). May be empty when only an image is shown. */
  content: string;
  /** Lower number = harder. 1..N matching index in the puzzle's clue array. */
  difficulty_rank?: number;
  metadata?: ClueMetadata;
}

export interface ClueMetadata {
  image_url?: string;
  thumb_url?: string;
  /** Alternate Commons images for the same clue type — rotated by date in daily mode. */
  image_options?: ClueImageOption[];
  audio_url?: string;
  alt_text?: string;
  /** Display label rendered above the media (when shown). Optional. */
  label?: string;
  /** Source attribution — Commons / Wikipedia page title. */
  source?: string;
  source_url?: string;
  /** Optional extra key-value bag for future clue types. */
  [key: string]: unknown;
}

export interface ClueImageOption {
  image_url?: string;
  thumb_url?: string;
  source?: string;
  source_url?: string;
  label?: string;
  license?: string;
  artist?: string;
  credit?: string;
}

/**
 * Answer-agnostic puzzle. `answer_type` + `answer` is the source of truth; the
 * server never returns `answer` to the client until the round closes.
 */
export interface Puzzle {
  id: string;
  date?: string;
  mode: GameMode;
  answer_type: AnswerType;
  /** Canonical display answer (e.g. "Japan"). Server-only field — never in client payload. */
  answer: string;
  answer_id?: string;
  alt_answers?: string[];
  region?: string;
  flag_url?: string;
  clues: Clue[];
  difficulty?: string;
  metadata?: Record<string, unknown>;
}

export interface ClientDailyRound {
  roundIndex: number;
  puzzleId: string;
  clueType: string;
  clue: ClientClue;
}

/** Daily mode payload — five rounds, each a different country and clue type. */
export interface ClientDailyPuzzle {
  /** Composite id for the daily session, e.g. `daily-2026-06-25`. */
  id: string;
  date: string;
  mode: "daily";
  answer_type: AnswerType;
  totalRounds: number;
  rounds: ClientDailyRound[];
  difficulty?: string;
}

export interface DailyRoundResult {
  roundIndex: number;
  clueType: string;
  puzzleId: string;
  guess: string;
  answer: string;
  distanceKm: number;
  roundScore: number;
  exact: boolean;
  surrendered?: boolean;
  flagUrl?: string;
}

export interface ClientClue {
  type: string;
  content: string;
  metadata?: ClueMetadata;
  difficulty_rank?: number;
}

export interface DailyGuessResult {
  exact: boolean;
  guess: string;
  answer: string;
  distanceKm: number;
  roundScore: number;
  completed: boolean;
  funFact: string | null;
  flagUrl: string | null;
  answerLat: number;
  answerLng: number;
  guessLat: number | null;
  guessLng: number | null;
  answerCca3: string;
  guessCca3: string | null;
}

/** Shown after each daily guess until the player taps Continue. */
export interface DailyRoundRecap {
  roundIndex: number;
  clueType: string;
  guess: string;
  answer: string;
  distanceKm: number;
  roundScore: number;
  exact: boolean;
  surrendered?: boolean;
  flagUrl?: string;
  answerLat: number;
  answerLng: number;
  guessLat: number | null;
  guessLng: number | null;
  answerCca3: string;
  guessCca3: string | null;
  isFinalRound: boolean;
}

/* ------------------------------------------------------------------ */
/*  Persisted client slice (zustand persist)                          */
/* ------------------------------------------------------------------ */

export const STORAGE_VERSION = "anyguessr-v6";