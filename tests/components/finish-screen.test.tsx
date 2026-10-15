import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinishScreen, type FinishScreenProps } from "@/components/daily/finish-screen";
import { clearDirectPlay, isDirectPlayRequested } from "@/lib/daily-intro/direct-play";
import { DAILY_GAMES, PUZZLE_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import type { GameStreakInfo } from "@/lib/streak/types";

let streaks: GameStreakInfo[] = [];

vi.mock("@/lib/streak/context", () => ({
  useStreak: () => ({ streaks }),
}));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const NOW = new Date("2026-10-06T15:23:00Z");

function streaksWithPlayed(played: DailyGameId[], streak = 4): GameStreakInfo[] {
  return DAILY_GAMES.map((id) => ({
    id,
    label: getGame(id).name,
    href: getGame(id).playHref,
    currentStreak: played.includes(id) ? streak : 0,
    playedToday: played.includes(id),
  }));
}

function renderScreen(props: Partial<FinishScreenProps> = {}) {
  return render(
    <FinishScreen
      gameId="brain-dead"
      open
      onClose={() => {}}
      result={<p>RESULT BODY</p>}
      shareText="share me"
      {...props}
    />,
  );
}

describe("FinishScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    localStorage.clear();
    streaks = streaksWithPlayed(["chainlink", "brain-dead"]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the game's result, the share button and the secondary link", () => {
    renderScreen({ secondary: { label: "Leaderboard", href: "/brain-dead/leaderboard" } });

    expect(screen.getByText("RESULT BODY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share result" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/brain-dead/leaderboard");
  });

  it("draws the bell curve only when a percentile is given", () => {
    const { unmount } = renderScreen();
    expect(screen.queryByTestId("finish-bell")).toBeNull();
    unmount();

    renderScreen({ curve: { percentile: 82, lowLabel: "0", highLabel: "4,000" } });
    const bell = screen.getByTestId("finish-bell");
    expect(within(bell).getByLabelText("Better than 82% of players")).toBeInTheDocument();
    expect(bell).toHaveTextContent("everyone who played today");
    expect(bell).toHaveTextContent("4,000");
  });

  it("ticks the played games, rings the current one and marks the next", () => {
    renderScreen();

    expect(screen.getByTestId("finish-chip-chainlink")).toHaveClass("is-done");
    expect(screen.getByTestId("finish-chip-brain-dead")).toHaveClass("is-done", "is-current");
    expect(screen.getByTestId("finish-chip-anyguessr")).toHaveClass("is-next");
    expect(screen.getByTestId("finish-chip-anyguessr")).toHaveTextContent("next");
    expect(screen.getByTestId("finish-chip-freezeframes")).not.toHaveClass("is-next");
    expect(screen.queryByTestId("finish-chip-hot-takes")).toBeNull();
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("2 of 6 today · 4 to go for a Sweep");
  });

  it("guides to the next unplayed game and lists the rest with what they are", () => {
    renderScreen();

    const upNext = screen.getByTestId("finish-up-next");
    expect(upNext).toHaveTextContent("Up next");
    expect(upNext).toHaveTextContent("~3 min");
    expect(upNext).toHaveTextContent(getGame("anyguessr").blurb);
    expect(within(upNext).getByRole("link", { name: "Play AnyGuessr →" })).toHaveAttribute("href", "/anyguessr");

    const others = within(screen.getByTestId("finish-others")).getAllByRole("link");
    expect(others.map((link) => link.getAttribute("href"))).toEqual([
      "/freezeframes/daily",
      "/ball-knowledge/daily",
      "/getting-warmer/daily",
    ]);
    expect(others[0]).toHaveTextContent(getGame("freezeframes").blurb);
  });

  it("opens the other games straight into play, but Ball Knowledge on its intro", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("link", { name: "Play AnyGuessr →" }));
    expect(isDirectPlayRequested("anyguessr")).toBe(true);
    clearDirectPlay("anyguessr");

    fireEvent.click(within(screen.getByTestId("finish-debate")).getByRole("link"));
    expect(isDirectPlayRequested("hot-takes")).toBe(true);
    clearDirectPlay("hot-takes");

    const others = within(screen.getByTestId("finish-others"));
    fireEvent.click(others.getByText(getGame("ball-knowledge").name));
    expect(isDirectPlayRequested("ball-knowledge")).toBe(false);
    fireEvent.click(screen.getByTestId("finish-chip-ball-knowledge"));
    expect(isDirectPlayRequested("ball-knowledge")).toBe(false);
  });

  it("counts the game just finished for a first-time visitor with no saved streaks", () => {
    streaks = [];
    renderScreen();

    expect(screen.getByTestId("finish-chip-brain-dead")).toHaveClass("is-done", "is-current");
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("1 of 6 today · 5 to go for a Sweep");
    expect(within(screen.getByTestId("finish-up-next")).getByRole("link")).toHaveAttribute("href", "/chainlink");
    expect(screen.getByTestId("finish-streak")).toHaveTextContent("Day 1 of your streak. Come back tomorrow to make it 2.");
  });

  it("shows the streak and what is left to the next milestone", () => {
    renderScreen();

    expect(screen.getByTestId("finish-streak")).toHaveTextContent("4 day streak. 3 more for a full week.");
    expect(screen.getByTestId("finish-streak").querySelectorAll(".fin-pips .is-on")).toHaveLength(4);
  });

  it("counts down to the next puzzles in the same words for every game", () => {
    renderScreen();
    expect(screen.getByTestId("finish-countdown")).toHaveTextContent("New puzzles in 8h 37m");
  });

  it("offers today's debate apart from the puzzles until Hot Takes is played", () => {
    const { unmount } = renderScreen();
    const debate = screen.getByTestId("finish-debate");
    expect(debate).toHaveTextContent("Today's debate");
    expect(within(debate).getByRole("link", { name: "Rank it →" })).toHaveAttribute("href", "/hot-takes");
    unmount();

    streaks = streaksWithPlayed(["chainlink", "brain-dead", "hot-takes"]);
    renderScreen();
    expect(screen.queryByTestId("finish-debate")).toBeNull();
  });

  function saveSweepDay(ids: readonly DailyGameId[]) {
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({
        version: 1,
        games: Object.fromEntries(DAILY_GAMES.map((id) => [id, { playDates: ids.includes(id) ? ["2026-10-06"] : [] }])),
      }),
    );
  }

  it("swaps Up next for a Sweep panel once every puzzle is played, and sends you to the debate", () => {
    streaks = streaksWithPlayed([...PUZZLE_GAMES]);
    saveSweepDay(PUZZLE_GAMES);
    renderScreen();

    expect(screen.queryByTestId("finish-up-next")).toBeNull();
    expect(screen.queryByTestId("finish-others")).toBeNull();
    expect(screen.queryByTestId("finish-debate")).toBeNull();
    expect(screen.queryByTestId("finish-countdown")).toBeNull();
    const sweep = screen.getByTestId("finish-sweep");
    expect(sweep).toHaveTextContent("Sweep. All six done today.");
    expect(sweep).toHaveTextContent("Your 1st Sweep.");
    expect(sweep).toHaveTextContent("New puzzles in 8h 37m");
    expect(within(sweep).getByRole("link", { name: "Now settle today's debate →" })).toHaveAttribute("href", "/hot-takes");
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("Sweep. All six done today.");
  });

  it("offers a Draft room after a Sweep when the debate is already settled", () => {
    streaks = streaksWithPlayed([...DAILY_GAMES]);
    saveSweepDay(DAILY_GAMES);
    renderScreen();

    const sweep = screen.getByTestId("finish-sweep");
    expect(within(sweep).getByRole("link", { name: "Create a Draft room →" })).toHaveAttribute("href", "/draft-anything");
  });

  describe("for Hot Takes", () => {
    it("leaves out the puzzle run and points back to the puzzles instead", () => {
      renderScreen({ gameId: "hot-takes" });

      expect(screen.getByText("RESULT BODY")).toBeInTheDocument();
      expect(screen.queryByTestId("finish-sweep-line")).toBeNull();
      expect(screen.queryByTestId("finish-up-next")).toBeNull();
      expect(screen.queryByTestId("finish-others")).toBeNull();
      expect(screen.queryByTestId("finish-debate")).toBeNull();
      const back = screen.getByTestId("finish-back-to-puzzles");
      expect(within(back).getByRole("link", { name: "Back to the puzzles · 4 left →" })).toHaveAttribute(
        "href",
        "/anyguessr",
      );
      expect(screen.getByRole("button", { name: "Start an argument" })).toBeInTheDocument();
      expect(screen.getByTestId("finish-countdown")).toHaveTextContent("New puzzles in 8h 37m");
    });

    it("says so when every puzzle is already done", () => {
      streaks = streaksWithPlayed([...PUZZLE_GAMES]);
      renderScreen({ gameId: "hot-takes" });

      expect(screen.getByTestId("finish-back-to-puzzles")).toHaveTextContent("All six puzzles done today.");
      expect(screen.queryByTestId("finish-sweep")).toBeNull();
    });
  });

  it("hands the game's colours to the overlay", () => {
    renderScreen({ gameId: "hot-takes" });

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.getPropertyValue("--bg")).toBe("var(--ht-bg)");
    expect(dialog.style.getPropertyValue("--text")).toBe("var(--ht-text)");
    expect(dialog.style.getPropertyValue("--fin-acc")).toBe("var(--ht-accent)");
  });

  it("moves the YOU label to the left of the marker when it would overhang the plot", () => {
    const marker = (percentile: number) => {
      const { unmount } = renderScreen({ curve: { percentile, lowLabel: "0", highLabel: "4,000" } });
      const me = screen.getByTestId("finish-bell").querySelector(".fin-bell-me");
      const flipped = me?.classList.contains("is-flipped");
      unmount();
      return flipped;
    };

    expect(marker(99)).toBe(true);
    expect(marker(98)).toBe(true);
    expect(marker(90)).toBe(false);
    expect(marker(50)).toBe(false);
    expect(marker(5)).toBe(false);
  });

  it("lets the inline accent win: only the overlay declares the gold fallback, never .fin", () => {
    // jsdom does not load the stylesheet, so check the rule that used to shadow the inline value.
    const css = readFileSync("app/globals.css", "utf8");
    const block = (selector: string) => css.match(new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")} \\{([^}]*)\\}`))?.[1] ?? "";
    expect(block(".fin")).not.toMatch(/--fin-acc\s*:/);
    expect(block(".daily-complete-overlay")).toMatch(/--fin-acc:\s*var\(--gold\)/);

    renderScreen({ gameId: "freezeframes" });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("daily-complete-overlay");
    expect(dialog.style.getPropertyValue("--fin-acc")).toBe("var(--ff-purple-light)");
  });

  it("renders nothing while closed", () => {
    renderScreen({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
