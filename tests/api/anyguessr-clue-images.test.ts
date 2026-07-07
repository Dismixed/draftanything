import { describe, expect, it } from "vitest";
import {
  dailyImageUrlForClue,
  getImageOptions,
  pickImageVariantIndex,
  redactClueForClient,
} from "@/lib/anyguessr/clue-images";
import { buildDailyRound } from "@/lib/anyguessr/daily";
import type { Clue } from "@/lib/anyguessr/types";

function imageClue(type: string, urls: string[]): Clue {
  return {
    type,
    content: `${type}-primary`,
    metadata: {
      hide_label: true,
      image_options: urls.map((url, index) => ({
        image_url: url,
        thumb_url: url,
        label: `${type}-${index}`,
      })),
      image_url: urls[0],
      thumb_url: urls[0],
    },
  };
}

describe("clue image variants", () => {
  const puzzle = {
    id: "puzzle-jpn",
    clues: [
      imageClue("flag", ["https://example.com/flag.jpg"]),
      imageClue("currency", ["https://example.com/yen.jpg"]),
      imageClue("jersey", ["https://example.com/jersey.jpg"]),
      imageClue("brand", ["https://example.com/toyota.jpg"]),
      imageClue("landmark", [
        "https://example.com/fuji.jpg",
        "https://example.com/tower.jpg",
      ]),
      { type: "written_language", content: "こんにちは" },
      imageClue("person", ["https://example.com/person-a.jpg"]),
      imageClue("food", [
        "https://example.com/sushi.jpg",
        "https://example.com/ramen.jpg",
      ]),
      imageClue("environment", [
        "https://example.com/shibuya.jpg",
        "https://example.com/inari.jpg",
      ]),
    ],
  };

  it("stores and reads multiple image options", () => {
    const landmark = puzzle.clues[4];
    expect(getImageOptions(landmark)).toHaveLength(2);
  });

  it("picks a deterministic image variant per date", () => {
    const landmark = puzzle.clues[4];
    const a = pickImageVariantIndex(landmark, "2026-06-25", puzzle.id);
    const b = pickImageVariantIndex(landmark, "2026-06-25", puzzle.id);
    const c = pickImageVariantIndex(landmark, "2026-06-26", puzzle.id);
    expect(a).toBe(b);
    expect(getImageOptions(landmark).length).toBeGreaterThan(1);
    expect([0, 1]).toContain(a);
    expect([0, 1]).toContain(c);
  });

  it("can show a different landmark photo on a different day", () => {
    const landmark = puzzle.clues[4];
    const dayA = dailyImageUrlForClue(landmark, puzzle.id, "2026-06-25");
    const dayB = dailyImageUrlForClue(landmark, puzzle.id, "2026-06-26");
    expect(dayA).toBeTruthy();
    expect(dayB).toBeTruthy();
  });

  it("strips image_options from the client payload", () => {
    const client = redactClueForClient(puzzle.clues[4], 1);
    expect(client.metadata?.image_url).toBe("https://example.com/tower.jpg");
    expect(client.metadata?.image_options).toBeUndefined();
  });

  it("builds daily rounds with the date-selected image", () => {
    const round = buildDailyRound(puzzle, "landmark", 4, "2026-06-25");
    const variantIndex = pickImageVariantIndex(
      puzzle.clues[4],
      "2026-06-25",
      puzzle.id,
    );
    expect(round.clue.metadata?.image_url).toBe(
      getImageOptions(puzzle.clues[4])[variantIndex]?.image_url,
    );
  });
});
