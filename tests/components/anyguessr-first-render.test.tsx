import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_VERSION } from "@/lib/anyguessr/types";

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/motion/confetti", () => ({ fireConfetti: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

const round = { roundIndex: 0, puzzleId: "p1", clueType: "flag", clue: { type: "flag", content: "" } };
const result = { roundIndex: 0, clueType: "flag", puzzleId: "p1", guess: "Chad", answer: "Chad", distanceKm: 0, roundScore: 100, exact: true };

describe("AnyGuessr first render in the browser", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  // The server-side half of this pair is anyguessr-first-render.server.test.tsx. Hydration
  // compares the two, so both must draw the same thing, even when a game is already saved.
  it("draws the loading placeholder before any effect has run, ignoring saved progress", async () => {
    localStorage.setItem(
      STORAGE_VERSION,
      JSON.stringify({
        state: { mode: "daily", puzzleId: "daily-x", date: "2026-10-07", status: "playing", dailyRounds: [round, { ...round, roundIndex: 1, puzzleId: "p2" }], currentRound: 1, roundResults: [result], totalScore: 100, roundRecap: null },
        version: 0,
      }),
    );
    const { default: AnyGuessrGame } = await import("@/components/anyguessr/game");
    const { useAnyGuessrStore } = await import("@/lib/anyguessr/store");
    // The saved game really is loaded, so anything it could show would differ from the server.
    expect(useAnyGuessrStore.getState().totalScore).toBe(100);

    const html = renderToString(<AnyGuessrGame />);

    expect(html).toContain("Loading puzzle");
    expect(html).not.toContain("ag-map-layer");
    expect(html).not.toContain("ag-stamp");
    expect(html).not.toContain(">100<");
  });
});
