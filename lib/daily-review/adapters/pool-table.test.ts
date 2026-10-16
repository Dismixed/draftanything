import { describe, expect, it } from "vitest";
import { rankPool } from "./pool-table";

describe("rankPool", () => {
  it("puts never-used first, then oldest-used, judged before the target date", () => {
    const pool = [{ id: "old" }, { id: "fresh" }, { id: "recent" }];
    const history = [
      { key: "old", date: "2026-09-01" },
      { key: "recent", date: "2026-10-10" },
      // Future rows do not count as use for an earlier date.
      { key: "fresh", date: "2026-10-20" },
    ];
    expect(rankPool(pool, history, "2026-10-16").map((p) => p.id)).toEqual(["fresh", "old", "recent"]);
  });
});
