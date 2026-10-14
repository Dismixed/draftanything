import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { getDateString } from "@/lib/getting-warmer/game-logic";

vi.mock("@/lib/motion/burst", () => ({ burstFrom: vi.fn() }));
vi.mock("@/lib/motion/impact-ring", () => ({ impactRing: vi.fn() }));
vi.mock("@/lib/motion/trigger-class", () => ({ triggerAnimation: vi.fn() }));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
// jsdom has no matchMedia; a still intro also keeps its demo timers out of the way.
vi.mock("@/lib/motion/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/lib/games/use-daily-percentile", () => ({
  finishCurve: () => null,
  useDailyPercentile: () => null,
}));
vi.mock("@/lib/getting-warmer/storage", () => ({
  fetchTodayLeaderboard: vi.fn().mockResolvedValue([]),
  getDailyPlayed: () => null,
  getSubmittedEntryId: () => null,
  saveDailyPlayed: vi.fn(),
  saveLeaderboardEntry: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

function json(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

describe("Getting Warmer while a guess is being checked", () => {
  let answerGuess: (res: Response) => void;

  beforeEach(() => {
    sessionStorage.setItem(
      `daily-puzzle:getting-warmer:${getDateString()}`,
      JSON.stringify({
        date: getDateString(),
        dayNumber: 1,
        initialClues: ["It is round", "It bounces"],
        authoredClueCount: 6,
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.endsWith("/guess")) {
          return new Promise<Response>((resolve) => {
            answerGuess = resolve;
          });
        }
        return Promise.resolve(json({ nextClue: "Prefetched clue" }));
      }),
    );
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  async function guess(text: string) {
    const user = userEvent.setup();
    const view = render(<GettingWarmerGame />);
    await user.click(screen.getByRole("button", { name: "Start guessing" }));
    await user.type(screen.getByPlaceholderText("Type your guess..."), text);
    await user.click(screen.getByRole("button", { name: "GUESS" }));
    return view;
  }

  // The answer is only known to the server, so a new clue row drawn before the reply is a
  // guess that a correct answer then has to take back.
  it("does not draw a next clue before the guess has been checked", async () => {
    const { container } = await guess("basketball");

    expect(container.querySelectorAll(".gw-clue")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Checking guess" })).toBeDisabled();

    answerGuess(json({ correct: true, answer: "BASKETBALL", attempts: 1 }));

    expect(await screen.findByText(/Nailed it in 1 guess/)).toBeInTheDocument();
    expect(container.querySelectorAll(".gw-clue")).toHaveLength(2);
  });

  it("adds the next clue once the guess comes back wrong", async () => {
    const { container } = await guess("football");

    answerGuess(json({ correct: false, nextClue: "It is orange", extraClues: [], attempts: 1 }));

    await waitFor(() => expect(container.querySelectorAll(".gw-clue")).toHaveLength(3));
    expect(screen.getByText("FOOTBALL")).toBeInTheDocument();
  });
});
