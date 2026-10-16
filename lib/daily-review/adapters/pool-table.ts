import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { lastUsedBefore, orderByLru } from "@/lib/schedule/lru";
import type { Candidate, Db, ReviewAdapter, ReviewGame, ReviewPreview, ScheduledSlot } from "../types";

type Row = Record<string, unknown> & { id: string };

export interface PoolTableConfig {
  game: ReviewGame;
  name: string;
  scheduleTable: string;
  /** Column on the schedule table holding the pool row's id. */
  contentColumn: "category_id" | "puzzle_id";
  poolTable: string;
  /** Select list for the pool table; must include `id`. */
  poolColumns: string;
  /** Status that removes an item from the approved pool. */
  retiredStatus: "rejected" | "archived";
  toPreview(row: Row): ReviewPreview;
}

/** Rows fetched per request; a single response stops at 1000. */
const PAGE_SIZE = 1000;

/** Pool in the order the game's LRU scheduler would pick it for `date`. */
export function rankPool<T extends { id: string }>(
  pool: readonly T[],
  history: readonly { key: string; date: string }[],
  date: string,
): T[] {
  return orderByLru(pool, (item) => item.id, lastUsedBefore(history, date));
}

/**
 * Adapter for games whose daily is one row from an approved pool table
 * (Hot Takes, Getting Warmer, FreezeFrames). The table names vary, so this
 * uses the untyped client; each call site's columns are listed in its config.
 */
export function poolTableAdapter(config: PoolTableConfig): ReviewAdapter {
  const raw = (db: Db) => db as unknown as SupabaseClient;

  async function loadPool(db: Db, ids?: string[]): Promise<Row[]> {
    const base = raw(db).from(config.poolTable).select(config.poolColumns);
    const { data, error } = ids
      ? await base.in("id", ids)
      : await base.eq("status", "approved").order("created_at", { ascending: true });
    if (error) throw new Error(`Failed to load ${config.poolTable}: ${error.message}`);
    return (data ?? []) as unknown as Row[];
  }

  async function loadHistory(db: Db): Promise<{ key: string; date: string }[]> {
    const rows: { key: string; date: string }[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await raw(db)
        .from(config.scheduleTable)
        .select(`${config.contentColumn}, publish_date`)
        .order("publish_date", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Failed to load ${config.scheduleTable}: ${error.message}`);
      const page = (data ?? []) as Record<string, string>[];
      rows.push(...page.map((r) => ({ key: r[config.contentColumn]!, date: r.publish_date! })));
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  return {
    game: config.game,
    name: config.name,

    async listScheduled(db, from, to): Promise<ScheduledSlot[]> {
      const { data, error } = await raw(db)
        .from(config.scheduleTable)
        .select(`${config.contentColumn}, publish_date`)
        .gte("publish_date", from)
        .lte("publish_date", to);
      if (error) throw new Error(`Failed to load ${config.scheduleTable}: ${error.message}`);
      const rows = (data ?? []) as Record<string, string>[];
      if (rows.length === 0) return [];

      const pool = await loadPool(db, rows.map((r) => r[config.contentColumn]!));
      const byId = new Map(pool.map((row) => [row.id, row]));
      return rows.map((r) => {
        const contentId = r[config.contentColumn]!;
        const row = byId.get(contentId);
        return {
          date: r.publish_date!,
          contentId,
          preview: row ? config.toPreview(row) : { title: "(missing)", adminHref: `/admin/${config.game}` },
        };
      });
    },

    async listCandidates(db, date): Promise<Candidate[]> {
      const [pool, history] = await Promise.all([loadPool(db), loadHistory(db)]);
      return rankPool(pool, history, date).map((row) => ({ contentId: row.id, preview: config.toPreview(row) }));
    },

    async swap(db, date, contentId) {
      const { error } = await raw(db)
        .from(config.scheduleTable)
        .upsert({ publish_date: date, [config.contentColumn]: contentId }, { onConflict: "publish_date" });
      if (error) throw new Error(`Failed to swap ${config.game} for ${date}: ${error.message}`);
    },

    async retire(db, contentId) {
      const { error } = await raw(db)
        .from(config.poolTable)
        .update({ status: config.retiredStatus })
        .eq("id", contentId);
      if (error) throw new Error(`Failed to retire ${config.game} ${contentId}: ${error.message}`);
    },
  };
}
