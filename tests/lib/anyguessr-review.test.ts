import { describe, expect, it } from "vitest";
import { reviewWarnings } from "@/lib/anyguessr/review";

const entry = (extra: Record<string, unknown> = {}) => ({
  country_common: "Jordan",
  clue_type: "person",
  wiki_title: "Queen Rania of Jordan",
  text_content: "Queen Rania",
  image_candidates: [{ image_url: "https://x/a.jpg" }],
  difficulty: "medium",
  ...extra,
});

describe("reviewWarnings", () => {
  it("has nothing to say about a complete clue", () => {
    expect(reviewWarnings(entry())).toEqual([]);
  });

  it("warns when an image clue has no image", () => {
    expect(reviewWarnings(entry({ image_candidates: [] }))).toContain("No usable image");
  });

  it("does not expect an image on a language clue", () => {
    const language = entry({ clue_type: "written_language", wiki_title: null, text_content: "Kif halak?", image_candidates: [] });
    expect(reviewWarnings(language)).toEqual([]);
  });

  it("warns when the name shown under a person gives the country away", () => {
    expect(reviewWarnings(entry({ text_content: "Queen Rania of Jordan" }))).toContain(
      "Shown name contains the country",
    );
  });

  it("warns when a clue has no difficulty yet", () => {
    expect(reviewWarnings(entry({ difficulty: null }))).toContain("No difficulty set");
  });
});
