import { describe, expect, it, vi } from "vitest";
import { activeCategories, pickLruCategory } from "./schedule-service";
import { CATEGORIES } from "./categories";

describe("activeCategories", () => {
  it("drops retired categories and keeps pool order", () => {
    const retired = [CATEGORIES[1]!];
    const active = activeCategories(retired);
    expect(active).not.toContain(CATEGORIES[1]);
    expect(active[0]).toBe(CATEGORIES[0]);
    expect(active).toHaveLength(CATEGORIES.length - 1);
  });
});

describe("pickLruCategory", () => {
  // A missing retired-categories table once sent four weeks of dailies to the fixed rotation.
  it("still picks when retired categories can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const db = {
      from: (table: string) => ({
        select: async () =>
          table === "ball_knowledge_schedule"
            ? { data: [{ category: CATEGORIES[0], publish_date: "2026-10-01" }], error: null }
            : { data: null, error: { message: "relation does not exist" } },
      }),
    } as never;
    expect(await pickLruCategory(db)).toBe(CATEGORIES[1]);
  });
});
