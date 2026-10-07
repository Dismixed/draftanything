import { describe, expect, it } from "vitest";
import { buildFramePrompt, frameUsable } from "@/lib/freezeframes/frame-check";

describe("buildFramePrompt", () => {
  it("asks whether a movie frame shows the title", () => {
    const prompt = buildFramePrompt({ roundKey: "movie", answer: "Jurassic Park" });
    expect(prompt).toContain("Jurassic Park");
    expect(prompt).toMatch(/title/i);
    expect(prompt).toContain("shows_answer");
  });

  it("asks whether an album cover shows the artist, since the artist is the answer", () => {
    const prompt = buildFramePrompt({ roundKey: "album", answer: "Nirvana", albumName: "Nevermind" });
    expect(prompt).toContain("Nirvana");
    expect(prompt).toMatch(/artist's name/i);
    // The album title on the cover is not the answer and is allowed.
    expect(prompt).toMatch(/album title .* is fine/i);
  });
});

describe("frameUsable", () => {
  const good = { usable: true, shows_answer: false, reason: "" };

  it("accepts a clear frame that does not show the answer", () => {
    expect(frameUsable(good)).toBe(true);
  });

  it("rejects a frame that shows the answer", () => {
    expect(frameUsable({ ...good, shows_answer: true })).toBe(false);
  });

  it("rejects a frame the reviewer found unusable", () => {
    expect(frameUsable({ ...good, usable: false })).toBe(false);
  });
});
