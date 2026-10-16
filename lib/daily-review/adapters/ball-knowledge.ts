import "server-only";

import { lastUsedBefore, orderByLru } from "@/lib/schedule/lru";
import {
  activeCategories,
  listRetiredCategories,
  listSchedule,
  retireCategory,
} from "@/lib/ball-knowledge/schedule-service";
import type { ReviewAdapter, ReviewPreview } from "../types";

const preview = (category: string): ReviewPreview => ({
  title: category,
  adminHref: "/admin/ball-knowledge",
});

export const ballKnowledgeAdapter: ReviewAdapter = {
  game: "ball-knowledge",
  name: "Ball Knowledge",

  async listScheduled(db, from, to) {
    const { data, error } = await db
      .from("ball_knowledge_schedule")
      .select("category, publish_date")
      .gte("publish_date", from)
      .lte("publish_date", to);
    if (error) throw new Error(`Failed to load ball knowledge schedule: ${error.message}`);
    return (data ?? []).map((row) => ({
      date: row.publish_date,
      contentId: row.category,
      preview: preview(row.category),
    }));
  },

  async listCandidates(db, date) {
    const [rows, retired] = await Promise.all([listSchedule(db), listRetiredCategories(db)]);
    const lastUsed = lastUsedBefore(
      rows.map((r) => ({ key: r.category, date: r.publish_date })),
      date,
    );
    return orderByLru(activeCategories(retired), (c) => c, lastUsed).map((category) => ({
      contentId: category,
      preview: preview(category),
    }));
  },

  async listBookedIds(db, from) {
    const { data, error } = await db
      .from("ball_knowledge_schedule")
      .select("category")
      .gte("publish_date", from);
    if (error) throw new Error(`Failed to load ball knowledge bookings: ${error.message}`);
    return new Set((data ?? []).map((row) => row.category));
  },

  async swap(db, date, contentId) {
    const { error } = await db
      .from("ball_knowledge_schedule")
      .upsert({ publish_date: date, category: contentId }, { onConflict: "publish_date" });
    if (error) throw new Error(`Failed to swap ball knowledge for ${date}: ${error.message}`);
  },

  async retire(db, contentId, clearFrom) {
    await retireCategory(db, contentId);
    const { error } = await db
      .from("ball_knowledge_schedule")
      .delete()
      .eq("category", contentId)
      .gte("publish_date", clearFrom);
    if (error) throw new Error(`Failed to clear bookings for ${contentId}: ${error.message}`);
  },
};
