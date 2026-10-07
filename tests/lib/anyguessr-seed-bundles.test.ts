import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { loadCountrySeedBundles } from "@/lib/anyguessr/seed-db";

const row = (cca3: string, country: string, clue_type: string, extra: Record<string, unknown> = {}) => ({
  id: `${cca3}-${clue_type}`,
  cca3,
  country_common: country,
  clue_type,
  wiki_title: "Some article",
  text_content: null,
  status: "approved",
  image_candidates: [],
  selected_candidate_index: 0,
  created_at: "2026-10-07T00:00:00Z",
  updated_at: "2026-10-07T00:00:00Z",
  ...extra,
});

const dbWith = (rows: unknown[]) =>
  ({ from: () => ({ select: async () => ({ data: rows, error: null }) }) }) as unknown as SupabaseClient<Database>;

describe("loadCountrySeedBundles", () => {
  it("includes a country that is in the pool but not in the original seed file", async () => {
    const bundles = await loadCountrySeedBundles(dbWith([row("CHL", "Chile", "food")]));
    expect(bundles).toHaveLength(1);
    expect(bundles[0]).toMatchObject({ cca3: "CHL", common: "Chile", capital: "Santiago" });
  });

  it("carries each clue's difficulty", async () => {
    const [bundle] = await loadCountrySeedBundles(
      dbWith([row("JPN", "Japan", "food", { difficulty: "easy" }), row("JPN", "Japan", "person")]),
    );
    expect(bundle.entries.map((e) => [e.clue_type, e.difficulty])).toEqual([
      ["person", null],
      ["food", "easy"],
    ]);
  });

  it("leaves out clues that are not approved", async () => {
    const bundles = await loadCountrySeedBundles(dbWith([row("CHL", "Chile", "food", { status: "needs_review" })]));
    expect(bundles).toEqual([]);
  });
});
