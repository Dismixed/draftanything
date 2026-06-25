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

export type GameMode = "daily" | "infinite";
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

/**
 * The shape sent to the client — strips the answer, returns only display info.
 */
export interface ClientPuzzle {
  id: string;
  date?: string;
  mode: GameMode;
  answer_type: AnswerType;
  region?: string;
  flag_url?: string;
  /** Clue at index N is `locked` until the player reveals it. */
  clues: ClientClue[];
  difficulty?: string;
}

export interface ClientClue {
  type: string;
  content: string;
  metadata?: ClueMetadata;
  difficulty_rank?: number;
}

/* ------------------------------------------------------------------ */
/*  Round / session-state                                               */
/* ------------------------------------------------------------------ */

export type ClueStatus = "locked" | "revealed";

export interface RoundState {
  puzzleId: string;
  mode: GameMode;
  date: string;
  answerType: AnswerType;
  region?: string;
  flagUrl?: string;
  /** Full set of clues the player has revealed. Index = reveal order. */
  revealedClues: ClientClue[];
  /** Total clue count in the puzzle (so progress dots can render locked ones). */
  totalClues: number;
  /** One entry per guess attempt, in submission order. */
  guesses: string[];
  score: number;
  /** Whether the round is over and why. */
  status: "playing" | "won" | "surrendered";
  /** Populated once the round is over. */
  answer?: string;
  altAnswers?: string[];
  funFact?: string;
  startTime: number;
}

/* ------------------------------------------------------------------ */
/*  Scoring                                                             */
/* ------------------------------------------------------------------ */

export const STARTING_SCORE = 1000;
export const REVEAL_PENALTY = 100;
export const WRONG_GUESS_PENALTY = 150;
export const MIN_SCORE = 0;

/* ------------------------------------------------------------------ */
/*  Guess result                                                        */
/* ------------------------------------------------------------------ */

export interface GuessResult {
  correct: boolean;
  /** True if we should auto-reveal next clue after this wrong guess. */
  autoReveal: boolean;
  /** Clue index to reveal (only when autoReveal). */
  revealIndex: number | null;
  /** True when this guess cleared the round (correct === true). */
  completed: boolean;
  /** Canonical answer, when the round is over. */
  normalizedAnswer: string | null;
  /** Optional fun-fact for the results screen. */
  funFact: string | null;
}

/* ------------------------------------------------------------------ */
/*  Persisted client slice (zustand persist)                          */
/* ------------------------------------------------------------------ */

export const STORAGE_VERSION = "anyguessr-v1";