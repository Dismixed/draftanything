import { describe, expect, it } from "vitest";
import { activeCategories } from "./schedule-service";
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
