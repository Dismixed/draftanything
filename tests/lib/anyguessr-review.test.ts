import { describe, expect, it } from "vitest";
import { reviewWarnings, toReviewEntry } from "@/lib/anyguessr/review";

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

describe("toReviewEntry", () => {
  const row = {
    id: "1",
    cca3: "JOR",
    country_common: "Jordan",
    clue_type: "person",
    wiki_title: "Queen Rania of Jordan",
    text_content: "Queen Rania",
    status: "needs_review",
    difficulty: "medium",
    selected_candidate_index: 0,
    notes: "kept",
    vision_notes: "ok 0.9: a long explanation the review page never shows",
    created_at: "2026-10-07",
    image_candidates: [
      { image_url: "https://x/full.jpg", thumb_url: "https://x/thumb.jpg", license: "CC BY-SA", artist: "Someone", credit: "…" },
    ],
  };

  it("keeps what a review card shows", () => {
    expect(toReviewEntry(row)).toMatchObject({
      id: "1",
      country_common: "Jordan",
      clue_type: "person",
      text_content: "Queen Rania",
      status: "needs_review",
      difficulty: "medium",
      notes: "kept",
    });
  });

  it("drops fields the card never shows, to keep the page quick to load", () => {
    const entry = toReviewEntry(row) as Record<string, unknown>;
    expect("vision_notes" in entry).toBe(false);
    expect("created_at" in entry).toBe(false);
    expect(entry.image_candidates).toEqual([{ image_url: "https://x/full.jpg", thumb_url: "https://x/thumb.jpg" }]);
  });
});
