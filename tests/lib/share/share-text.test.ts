import { describe, expect, it } from "vitest";
import { buildShareText, formatShareDate, shareUrl, squares } from "@/lib/share/share-text";

describe("share text", () => {
  it("formats a puzzle date without the year", () => {
    expect(formatShareDate("2026-10-06")).toBe("Oct 6");
    expect(formatShareDate("2026-01-31")).toBe("Jan 31");
  });

  it("links to where the game is played, marked as a share", () => {
    expect(shareUrl("chainlink")).toBe("https://stimgames.com/chainlink?ref=share");
    expect(shareUrl("brain-dead")).toBe("https://stimgames.com/brain-dead/daily?ref=share");
  });

  it("puts the game name and label first and the link last", () => {
    const text = buildShareText({ gameId: "brain-dead", label: "Oct 6", lines: ["11 of 15 · 4,250 pts"] });
    expect(text.split("\n")).toEqual([
      "Brain Dead · Oct 6",
      "11 of 15 · 4,250 pts",
      "https://stimgames.com/brain-dead/daily?ref=share",
    ]);
  });

  it("drops empty lines", () => {
    const text = buildShareText({ gameId: "chainlink", label: "Oct 6", lines: ["", "🟩🟩"] });
    expect(text.split("\n")).toHaveLength(3);
  });

  it("draws one square per value", () => {
    expect(squares(["good", "ok", "bad"])).toBe("🟩🟨🟥");
  });
});
