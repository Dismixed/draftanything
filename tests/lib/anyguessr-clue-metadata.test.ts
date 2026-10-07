import { describe, expect, it } from "vitest";
import { withLineupMetadata } from "@/lib/anyguessr/generator";
import type { SeedEntryRow } from "@/lib/anyguessr/seed-types";
import type { Clue } from "@/lib/anyguessr/types";

const clue: Clue = { type: "person", content: "Queen Rania of Jordan", difficulty_rank: 6, metadata: { hide_label: true } };
const entry = (extra: Partial<SeedEntryRow>) =>
  ({ clue_type: "person", text_content: "Queen Rania", difficulty: "medium", ...extra }) as SeedEntryRow;

describe("withLineupMetadata", () => {
  it("carries the clue's difficulty for the lineup to read", () => {
    expect(withLineupMetadata(clue, entry({})).metadata?.difficulty).toBe("medium");
  });

  it("gives a person the name shown under the photo", () => {
    expect(withLineupMetadata(clue, entry({})).metadata?.caption).toBe("Queen Rania");
  });

  it("does not caption other clue types, whose text would name the answer", () => {
    const landmark = withLineupMetadata({ ...clue, type: "landmark" }, entry({ clue_type: "landmark", text_content: "Petra" }));
    expect(landmark.metadata && "caption" in landmark.metadata).toBe(false);
  });

  it("leaves an unrated clue without a difficulty", () => {
    const unrated = withLineupMetadata(clue, entry({ difficulty: null }));
    expect(unrated.metadata && "difficulty" in unrated.metadata).toBe(false);
  });
});
