import "server-only";

import { roundLabel } from "@/lib/freezeframes/puzzle-db";
import { createReviewStore } from "../store";
import type { ReviewContext } from "../service";
import type { Db, ReviewAdapter } from "../types";
import { ballKnowledgeAdapter } from "./ball-knowledge";
import { chainlinkAdapter } from "./chainlink";
import { poolTableAdapter } from "./pool-table";

const asRound = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const REVIEW_ADAPTERS: ReviewAdapter[] = [
  poolTableAdapter({
    game: "hot-takes",
    name: "Hot Takes",
    scheduleTable: "hot_takes_schedule",
    contentColumn: "category_id",
    poolTable: "hot_takes_categories",
    poolColumns: "id, name, cover_image_url",
    retiredStatus: "rejected",
    toPreview: (row) => ({
      title: String(row.name),
      imageUrl: (row.cover_image_url as string | null) ?? undefined,
      adminHref: "/admin/hot-takes",
    }),
  }),
  ballKnowledgeAdapter,
  poolTableAdapter({
    game: "getting-warmer",
    name: "Getting Warmer",
    scheduleTable: "daily_getting_warmer_puzzles",
    contentColumn: "puzzle_id",
    poolTable: "getting_warmer_puzzles",
    poolColumns: "id, answer, clues",
    retiredStatus: "archived",
    toPreview: (row) => ({
      title: String(row.answer).toUpperCase(),
      subtitle: Array.isArray(row.clues) ? String(row.clues[0] ?? "") : undefined,
      adminHref: "/admin/getting-warmer",
    }),
  }),
  poolTableAdapter({
    game: "freezeframes",
    name: "FreezeFrames",
    scheduleTable: "daily_freezeframes_puzzles",
    contentColumn: "puzzle_id",
    poolTable: "freezeframes_puzzles",
    poolColumns: "id, movie, song, show, album",
    retiredStatus: "archived",
    toPreview: (row) => {
      const movie = asRound(row.movie);
      return {
        title: roundLabel(movie),
        subtitle: [row.song, row.show, row.album].map((r) => roundLabel(asRound(r))).join(" · "),
        imageUrl: typeof movie.img === "string" ? movie.img : undefined,
        adminHref: "/admin/freezeframes",
      };
    },
  }),
  chainlinkAdapter,
];

export function createReviewContext(db: Db): ReviewContext {
  return { db, adapters: REVIEW_ADAPTERS, store: createReviewStore(db) };
}
