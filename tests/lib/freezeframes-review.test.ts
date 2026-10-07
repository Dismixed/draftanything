import { describe, expect, it } from "vitest";
import { reviewWarnings } from "@/lib/freezeframes/review";

const entry = (extra: Record<string, unknown> = {}) => ({
  round_key: "movie",
  img: "https://x/frame.jpg",
  audio: null,
  resolve_notes: null,
  ...extra,
});

describe("reviewWarnings", () => {
  it("has nothing to say about a complete entry", () => {
    expect(reviewWarnings(entry())).toEqual([]);
  });

  it("surfaces doubts about whether the lookup found the right title", () => {
    const notes = "CHECK: Matched the 2015 release, expected 1977\nFrame 1: shows the answer (poster)";
    expect(reviewWarnings(entry({ resolve_notes: notes }))).toEqual(["Matched the 2015 release, expected 1977"]);
  });

  it("warns when an image round has no image", () => {
    expect(reviewWarnings(entry({ img: null }))).toContain("No image");
  });

  it("warns when a song has no audio clip, and does not expect an image", () => {
    expect(reviewWarnings(entry({ round_key: "song", img: null, audio: null }))).toEqual(["No audio clip"]);
    expect(reviewWarnings(entry({ round_key: "song", img: null, audio: "https://x/a.m4a" }))).toEqual([]);
  });
});
