import "server-only";

import type { Db, ReviewGame } from "./types";

export interface ReviewRecord {
  game: ReviewGame;
  publishDate: string;
  contentId: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ReviewStore {
  listReviews(from: string, to: string): Promise<ReviewRecord[]>;
  upsertReview(review: Omit<ReviewRecord, "reviewedAt">): Promise<void>;
  lastEmailSentAt(): Promise<string | null>;
  recordEmail(unreviewedCount: number): Promise<void>;
}

export function createReviewStore(db: Db): ReviewStore {
  return {
    async listReviews(from, to) {
      const { data, error } = await db
        .from("daily_reviews")
        .select("game, publish_date, content_id, reviewed_by, reviewed_at")
        .gte("publish_date", from)
        .lte("publish_date", to);
      if (error) throw new Error(`Failed to load reviews: ${error.message}`);
      return (data ?? []).map((row) => ({
        game: row.game as ReviewGame,
        publishDate: row.publish_date,
        contentId: row.content_id,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
      }));
    },

    async upsertReview(review) {
      const { error } = await db.from("daily_reviews").upsert(
        {
          game: review.game,
          publish_date: review.publishDate,
          content_id: review.contentId,
          reviewed_by: review.reviewedBy,
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: "game,publish_date" },
      );
      if (error) throw new Error(`Failed to save review: ${error.message}`);
    },

    async lastEmailSentAt() {
      const { data, error } = await db
        .from("daily_review_emails")
        .select("sent_at")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Failed to load review emails: ${error.message}`);
      return data?.sent_at ?? null;
    },

    async recordEmail(unreviewedCount) {
      const { error } = await db
        .from("daily_review_emails")
        .insert({ unreviewed_count: unreviewedCount });
      if (error) throw new Error(`Failed to record review email: ${error.message}`);
    },
  };
}
