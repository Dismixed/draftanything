import "server-only";

import { revalidateTag } from "next/cache";
import { dailyChainTag } from "@/lib/chainlink/daily-cache";
import type { Db, ReviewAdapter, ReviewPreview } from "../types";

interface ChainRow {
  id: string;
  words: unknown;
  difficulty: string;
  created_by: string | null;
}

function preview(row: ChainRow): ReviewPreview {
  const words = Array.isArray(row.words) ? (row.words as string[]) : [];
  const generated = row.created_by === "cron" ? " · generated, not human-reviewed" : "";
  return {
    title: words.join(" → ") || "(no words)",
    subtitle: `${row.difficulty}${generated}`,
    adminHref: "/admin/chains",
  };
}

async function setStatus(db: Db, id: string, status: string) {
  const { error } = await db
    .from("chain_puzzles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Failed to set chain ${id} to ${status}: ${error.message}`);
}

export const chainlinkAdapter: ReviewAdapter = {
  game: "chainlink",
  name: "Chain Link",

  async listScheduled(db, from, to) {
    const { data, error } = await db
      .from("daily_chain_puzzles")
      .select("puzzle_id, publish_date")
      .gte("publish_date", from)
      .lte("publish_date", to);
    if (error) throw new Error(`Failed to load chain schedule: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const { data: chains, error: chainError } = await db
      .from("chain_puzzles")
      .select("id, words, difficulty, created_by")
      .in(
        "id",
        rows.map((r) => r.puzzle_id),
      );
    if (chainError) throw new Error(`Failed to load chains: ${chainError.message}`);
    const byId = new Map((chains ?? []).map((c) => [c.id, c]));

    return rows.map((r) => {
      const chain = byId.get(r.puzzle_id);
      return {
        date: r.publish_date,
        contentId: r.puzzle_id,
        preview: chain ? preview(chain) : { title: "(missing)", adminHref: "/admin/chains" },
      };
    });
  },

  // Chain Link never recycles: candidates are approved chains not yet on the
  // calendar, best score first, matching the scheduler's tie-break.
  async listCandidates(db) {
    const { data, error } = await db
      .from("chain_puzzles")
      .select("id, words, difficulty, created_by")
      .eq("status", "approved")
      .order("score", { ascending: false });
    if (error) throw new Error(`Failed to load approved chains: ${error.message}`);
    return (data ?? []).map((row) => ({ contentId: row.id, preview: preview(row) }));
  },

  async swap(db, date, contentId, previous) {
    const { error } = await db
      .from("daily_chain_puzzles")
      .upsert({ publish_date: date, puzzle_id: contentId }, { onConflict: "publish_date" });
    if (error) throw new Error(`Failed to swap chain for ${date}: ${error.message}`);

    await setStatus(db, contentId, "scheduled");
    // Back into the pool; retire() runs after this when the admin also retires it.
    if (previous && previous !== contentId) await setStatus(db, previous, "approved");
    revalidateTag(dailyChainTag(date), { expire: 0 });
  },

  retire: (db, contentId) => setStatus(db, contentId, "rejected"),
};
