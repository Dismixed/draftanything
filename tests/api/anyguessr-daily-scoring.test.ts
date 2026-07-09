import { describe, expect, it } from "vitest";
import {
  DAILY_MAX_ROUND_SCORE,
  DAILY_ROUND_COUNT,
  canFillDailyRounds,
  formatDistanceKm,
  isDailyCluePlayable,
  maxDailyLookbackDays,
  pickDailyPuzzles,
  scoreFromDistanceKm,
} from "@/lib/anyguessr/daily";
import type { Clue } from "@/lib/anyguessr/types";
import { haversineKm, resolveGuessToCca3, distanceBetweenCountriesKm } from "@/lib/anyguessr/country-geo";
import { boundsForPoints, equirectangularViewBox, projectLatLng } from "@/lib/anyguessr/map-projection";

describe("AnyGuessr daily scoring", () => {
  it("awards full round score at zero distance", () => {
    expect(scoreFromDistanceKm(0)).toBe(DAILY_MAX_ROUND_SCORE);
    expect(scoreFromDistanceKm(10)).toBe(DAILY_MAX_ROUND_SCORE);
  });

  it("decays score with distance", () => {
    const mid = scoreFromDistanceKm(2500);
    const far = scoreFromDistanceKm(8000);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(0);
  });

  it("formats distances for display", () => {
    expect(formatDistanceKm(0)).toBe("0 km");
    expect(formatDistanceKm(42.4)).toBe("42 km");
    expect(formatDistanceKm(1234)).toBe("1,234 km");
  });
});

describe("country geo lookup", () => {
  it("resolves picker country names to cca3", () => {
    expect(resolveGuessToCca3("France")).toBe("FRA");
    expect(resolveGuessToCca3("United States")).toBe("USA");
    expect(resolveGuessToCca3("South Korea")).toBe("KOR");
  });

  it("scores nearby countries with non-zero points", () => {
    const km = distanceBetweenCountriesKm("FRA", "DEU");
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(1000);
    expect(scoreFromDistanceKm(km)).toBeGreaterThan(0);
  });
});

describe("AnyGuessr haversineKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(haversineKm([48.8566, 2.3522], [48.8566, 2.3522])).toBe(0);
  });

  it("computes a plausible Paris–London distance", () => {
    const km = haversineKm([48.8566, 2.3522], [51.5074, -0.1278]);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(400);
  });
});

describe("map projection", () => {
  it("builds a viewBox that contains both points", () => {
    const bounds = boundsForPoints(
      { lat: 48.85, lng: 2.35 },
      { lat: 51.5, lng: -0.12 },
    );
    const [x, y, w, h] = equirectangularViewBox(bounds, 720, 360).split(" ").map(Number);
    const paris = projectLatLng(48.85, 2.35, 720, 360);
    const london = projectLatLng(51.5, -0.12, 720, 360);
    expect(paris.x).toBeGreaterThanOrEqual(x);
    expect(paris.x).toBeLessThanOrEqual(x + w);
    expect(london.y).toBeGreaterThanOrEqual(y);
    expect(london.y).toBeLessThanOrEqual(y + h);
  });
});

describe("pickDailyPuzzles", () => {
  const cca3Pool = [
    "JPN", "FRA", "ITA", "EGY", "BRA", "IND", "CHN", "MEX", "ESP",
    "GBR", "USA", "RUS", "DEU", "KOR", "THA", "GRC", "TUR", "PRT",
  ];

  function imageClue(type: string, content: string): Clue {
    const url = `https://example.com/${type}-${content}.jpg`;
    return {
      type,
      content,
      metadata: { image_url: url, thumb_url: url },
    };
  }

  const pool = Array.from({ length: 18 }, (_, i) => ({
    id: `puzzle-${i}`,
    answer_id: cca3Pool[i],
    clues: [
      imageClue("flag", `flag-${i}`),
      imageClue("currency", `currency-${i}`),
      imageClue("jersey", `jersey-${i}`),
      imageClue("brand", `brand-${i}`),
      imageClue("landmark", `landmark-${i}`),
      { type: "written_language", content: `greeting-${i}` },
      imageClue("person", `person-${i}`),
      imageClue("food", `food-${i}`),
      imageClue("environment", `environment-${i}`),
    ],
  }));

  it("picks nine unique puzzles deterministically per date", () => {
    const a = pickDailyPuzzles(pool, "2026-06-25");
    const b = pickDailyPuzzles(pool, "2026-06-25");
    expect(a).toHaveLength(DAILY_ROUND_COUNT);
    expect(b.map((p) => p.id)).toEqual(a.map((p) => p.id));
    expect(new Set(a.map((p) => p.id)).size).toBe(DAILY_ROUND_COUNT);
  });

  it("picks a different set for a different date", () => {
    const a = pickDailyPuzzles(pool, "2026-06-25").map((p) => p.id);
    const b = pickDailyPuzzles(pool, "2026-06-26").map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("avoids countries used on the prior day when the pool allows", () => {
    const prior = pickDailyPuzzles(pool, "2026-06-24", {}).map((p) => p.id);
    const today = pickDailyPuzzles(pool, "2026-06-25").map((p) => p.id);
    expect(today.some((id) => prior.includes(id))).toBe(false);
  });

  it("avoids repeating the same language clue text on consecutive days", () => {
    const priorLanguage = pickDailyPuzzles(pool, "2026-06-24", {})[5].clues.find(
      (clue) => clue.type === "written_language",
    )?.content;
    const todayLanguage = pickDailyPuzzles(pool, "2026-06-25")[5].clues.find(
      (clue) => clue.type === "written_language",
    )?.content;
    expect(todayLanguage).not.toBe(priorLanguage);
  });

  it("computes lookback from pool size", () => {
    expect(maxDailyLookbackDays(18)).toBe(1);
    expect(maxDailyLookbackDays(35)).toBe(2);
  });

  it("skips puzzles with empty image clues for a round", () => {
    const brokenJersey = {
      id: "broken-jersey",
      answer_id: "NLD",
      clues: [
        imageClue("flag", "x"),
        imageClue("currency", "x"),
        { type: "jersey", content: "" },
        imageClue("brand", "x"),
        imageClue("landmark", "x"),
        { type: "written_language", content: "hello" },
        imageClue("person", "x"),
        imageClue("food", "x"),
        imageClue("environment", "x"),
      ],
    };
    const picks = pickDailyPuzzles([brokenJersey, ...pool], "2026-07-09");
    expect(picks[2].id).not.toBe("broken-jersey");
  });
});

describe("daily clue playability", () => {
  it("requires text for written_language", () => {
    expect(
      isDailyCluePlayable("written_language", {
        type: "written_language",
        content: "  ",
      }),
    ).toBe(false);
    expect(
      isDailyCluePlayable("written_language", {
        type: "written_language",
        content: "Hallo",
      }),
    ).toBe(true);
  });

  it("accepts currency clues with image or text", () => {
    expect(
      isDailyCluePlayable("currency", {
        type: "currency",
        content: "",
        metadata: {
          image_url: "https://example.com/yen.jpg",
        },
      }),
    ).toBe(true);
    expect(
      isDailyCluePlayable("currency", {
        type: "currency",
        content: "¥",
      }),
    ).toBe(true);
    expect(
      isDailyCluePlayable("currency", {
        type: "currency",
        content: "",
      }),
    ).toBe(false);
  });

  it("requires images for flag clues", () => {
    expect(
      isDailyCluePlayable("flag", {
        type: "flag",
        content: "",
        metadata: { alt_text: "national flag" },
      }),
    ).toBe(false);
    expect(
      isDailyCluePlayable("flag", {
        type: "flag",
        content: "",
        metadata: {
          image_url: "https://flagcdn.com/w320/fr.png",
        },
      }),
    ).toBe(true);
  });

  it("requires playable coverage for every daily round type", () => {
    const partialPool = [
      {
        id: "only-flag",
        clues: [
          {
            type: "flag",
            content: "",
            metadata: { image_url: "https://example.com/flag.jpg" },
          },
        ],
      },
    ];
    expect(canFillDailyRounds(partialPool)).toBe(false);
  });
});
