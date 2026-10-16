import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const REVIEW_GAMES = [
  "hot-takes",
  "ball-knowledge",
  "getting-warmer",
  "freezeframes",
  "chainlink",
] as const;
export type ReviewGame = (typeof REVIEW_GAMES)[number];

export type Db = SupabaseClient<Database>;

export interface ReviewPreview {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  /** That game's admin page, for full detail. */
  adminHref: string;
}

export interface ScheduledSlot {
  date: string;
  contentId: string;
  preview: ReviewPreview;
}

export interface Candidate {
  contentId: string;
  preview: ReviewPreview;
}

export interface ReviewAdapter {
  game: ReviewGame;
  name: string;
  /** Schedule rows with publish_date in [from, to], with previews. */
  listScheduled(db: Db, from: string, to: string): Promise<ScheduledSlot[]>;
  /**
   * Every eligible (non-retired) pool item in the order the game's own
   * scheduler would pick them for `date`. The service removes anything
   * already scheduled in the review window.
   */
  listCandidates(db: Db, date: string): Promise<Candidate[]>;
  /** Make `contentId` the content for `date`. `previous` is what was there (or null). */
  swap(db: Db, date: string, contentId: string, previous: string | null): Promise<void>;
  retire(db: Db, contentId: string): Promise<void>;
}

export interface ReviewCell {
  date: string;
  contentId: string | null;
  preview: ReviewPreview | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  locked: boolean;
}

export interface ReviewColumn {
  game: ReviewGame;
  name: string;
  /** Set when this game's adapter failed; `cells` is then empty. */
  error: string | null;
  cells: ReviewCell[];
}

export interface ReviewGrid {
  today: string;
  dates: string[];
  columns: ReviewColumn[];
}

export interface ReviewSummary {
  total: number;
  byGame: { game: ReviewGame; name: string; count: number; first: string | null }[];
}

export type ReviewErrorCode = "LOCKED" | "STALE" | "NOT_SCHEDULED" | "UNKNOWN_GAME";

export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

export function isReviewGame(value: unknown): value is ReviewGame {
  return typeof value === "string" && (REVIEW_GAMES as readonly string[]).includes(value);
}
