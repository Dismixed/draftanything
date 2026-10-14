import { afterEach, describe, expect, it } from "vitest";
import { getHotTakesPlayed, saveHotTakesPlayed } from "@/lib/hot-takes/storage";

describe("Hot Takes storage", () => {
  afterEach(() => localStorage.clear());

  it("restores today's ranking for the same category", () => {
    saveHotTakesPlayed({ category: "Fast food chains", placements: { a: "S", b: "D" } });
    expect(getHotTakesPlayed("Fast food chains")).toEqual({
      category: "Fast food chains",
      placements: { a: "S", b: "D" },
    });
  });

  it("ignores a ranking saved for a different category", () => {
    saveHotTakesPlayed({ category: "Cereals", placements: { a: "S" } });
    expect(getHotTakesPlayed("Fast food chains")).toBeNull();
  });

  it("returns null when nothing is saved or the value is broken", () => {
    expect(getHotTakesPlayed("Cereals")).toBeNull();
    localStorage.setItem(`hot_takes_played_${new Date().toISOString().slice(0, 10)}`, "{oops");
    expect(getHotTakesPlayed("Cereals")).toBeNull();
  });
});
