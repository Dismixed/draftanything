import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const saveDailyPlayed = vi.hoisted(() => vi.fn());
const useDailyPercentile = vi.hoisted(() => vi.fn(() => null));

vi.mock("@/lib/ball-knowledge/storage", () => ({
  fetchTodayLeaderboard: vi.fn(async () => []),
  getDailyPlayed: vi.fn(() => null),
  saveDailyPlayed,
  saveLeaderboardEntry: vi.fn(),
}));
vi.mock("@/lib/games/use-daily-percentile", () => ({
  finishCurve: () => null,
  useDailyPercentile,
}));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
vi.mock("@/lib/game-how-it-works", () => ({
  useGameHowItWorks: () => ({ showHowItWorks: false, dismissHowItWorks: vi.fn() }),
}));
vi.mock("@/lib/theme/theme-context", () => ({
  useTheme: () => ({ theme: "dark" }),
  setThemeColorOverride: vi.fn(),
}));
vi.mock("@/lib/motion/burst", () => ({ burstFrom: vi.fn() }));
vi.mock("@/components/ui/game-back-link", () => ({ GameBackLink: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import BallKnowledgeGame from "@/components/ball-knowledge/game";

describe("BallKnowledgeGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    saveDailyPlayed.mockClear();
    useDailyPercentile.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("saves the number of accepted answers as the day's score when the clock runs out", async () => {
    render(<BallKnowledgeGame category="Pizza Toppings" />);
    fireEvent.click(screen.getByRole("button", { name: "START" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const input = screen.getByPlaceholderText(/Type an answer/);
    for (const answer of ["Pepperoni", "Sausage", "Bacon"]) {
      fireEvent.change(input, { target: { value: answer } });
      fireEvent.keyDown(input, { key: "Enter" });
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    // The clock's updater can be replayed by React, so the save may repeat; every call must carry the real score.
    expect(saveDailyPlayed).toHaveBeenCalled();
    for (const args of saveDailyPlayed.mock.calls) expect(args).toEqual([3, "Pizza Toppings"]);
    expect(useDailyPercentile).toHaveBeenLastCalledWith(
      "ball-knowledge",
      3,
      expect.objectContaining({ enabled: true, record: true }),
    );
  });
});
