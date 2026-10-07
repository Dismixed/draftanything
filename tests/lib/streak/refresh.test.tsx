import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreakProvider, useStreak } from "@/lib/streak/context";
import { recordDailyCompletion } from "@/lib/streak/storage";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

function PlayedToday() {
  const { streaks } = useStreak();
  return <p data-testid="played">{streaks.filter((s) => s.playedToday).map((s) => s.id).join(",")}</p>;
}

function renderProvider() {
  render(
    <StreakProvider>
      <PlayedToday />
    </StreakProvider>,
  );
}

describe("StreakProvider keeps 'played today' current", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T23:50:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("clears yesterday's plays when the UTC day rolls over in an open tab", () => {
    recordDailyCompletion("chainlink");
    renderProvider();
    expect(screen.getByTestId("played")).toHaveTextContent("chainlink");

    act(() => {
      vi.advanceTimersByTime(11 * 60 * 1000);
    });

    expect(screen.getByTestId("played")).toHaveTextContent("");
    expect(screen.getByTestId("played").textContent).toBe("");
  });

  it("re-reads plays when the tab becomes visible again", () => {
    renderProvider();
    expect(screen.getByTestId("played").textContent).toBe("");

    // Written without the completion event, as another tab would.
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({ version: 1, games: { "brain-dead": { playDates: ["2026-10-06"] } } }),
    );
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByTestId("played")).toHaveTextContent("brain-dead");
  });

  it("re-reads plays when another tab changes storage", () => {
    renderProvider();
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({ version: 1, games: { "hot-takes": { playDates: ["2026-10-06"] } } }),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "stim_daily_streaks" }));
    });

    expect(screen.getByTestId("played")).toHaveTextContent("hot-takes");
  });
});
