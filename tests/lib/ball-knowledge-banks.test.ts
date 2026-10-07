import { describe, expect, it } from "vitest";
import { getAnswerBank } from "@/lib/ball-knowledge/answer-banks";
import { CATEGORIES } from "@/lib/ball-knowledge/categories";

describe("Ball Knowledge answer banks", () => {
  it("lists each category once", () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });

  it.each(CATEGORIES)("%s has a usable bank", (category) => {
    const bank = getAnswerBank(category);
    expect(bank, "missing bank").not.toBeNull();
    // A player can name ten in a minute, so a smaller bank is not a real category.
    expect(bank!.length).toBeGreaterThanOrEqual(10);

    // An alias claimed by two answers would count one answer as the other.
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const entry of bank!) {
      for (const alias of entry.aliases) {
        const previous = owner.get(alias);
        if (previous && previous !== entry.canonical) clashes.push(`"${alias}": ${previous} / ${entry.canonical}`);
        owner.set(alias, entry.canonical);
      }
    }
    expect(clashes).toEqual([]);
  });
});
