import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Today } from "@/components/home/today";
import { track } from "@/lib/analytics/track";
import { DAILY_GAMES, PUZZLE_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { featuredGameForDay, dailyDayNumber } from "@/lib/games/today";
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
const DAY = dailyDayNumber(NOW);

function streaksWithPlayed(played: DailyGameId[]): GameStreakInfo[] {
  return DAILY_GAMES.map((id) => ({
    id,
    label: getGame(id).name,
    href: getGame(id).playHref,
    currentStreak: played.includes(id) ? 3 : 0,
    playedToday: played.includes(id),
  }));
}

describe("Today", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(track).mockReset();
    streaks = [];
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the day's featured game and five puzzle cards for a first-time visitor", () => {
    render(<Today dayNumber={DAY} debateCategory="Fast food chains" />);

    const featured = getGame(featuredGameForDay(DAY));
    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Today's featured game");
    expect(slot).toHaveTextContent(featured.name);
    expect(within(slot).getByRole("link")).toHaveAttribute("href", featured.playHref);

    const lineup = within(screen.getByTestId("home-lineup")).getAllByRole("link");
    expect(lineup).toHaveLength(5);
    expect(lineup.map((link) => link.getAttribute("href"))).not.toContain("/hot-takes");
    expect(screen.getByTestId("home-progress")).toHaveTextContent("6 new puzzles today");
  });

  it("features the next unplayed game and counts what is done", () => {
    const first = featuredGameForDay(DAY);
    const second = featuredGameForDay(DAY + 1);
    streaks = streaksWithPlayed([first, "getting-warmer", "hot-takes"]);

    render(<Today dayNumber={DAY} debateCategory="Fast food chains" />);

    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Up next");
    expect(slot).toHaveTextContent(getGame(second).name);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("2 of 6 done today");

    const cards = within(screen.getByTestId("home-lineup")).getAllByRole("link");
    expect(cards).toHaveLength(5);
    expect(cards[3]).toHaveTextContent("Done today");
    expect(cards[4]).toHaveTextContent("Done today");
    expect(cards[0]).not.toHaveTextContent("Done today");
  });

  it("shows the all-done state with a countdown when every puzzle is played, Hot Takes or not", () => {
    streaks = streaksWithPlayed([...PUZZLE_GAMES]);

    render(<Today dayNumber={DAY} debateCategory="Fast food chains" />);

    expect(screen.queryByTestId("home-featured")).toBeNull();
    const done = screen.getByTestId("home-all-done");
    expect(done).toHaveTextContent("All six done.");
    expect(done).toHaveTextContent("New puzzles in 12h 37m");
    expect(done).not.toHaveTextContent("Hot Takes");
    expect(within(done).getByRole("link")).toHaveAttribute("href", "/draft-anything/play");
    expect(within(screen.getByTestId("home-lineup")).getAllByRole("link")).toHaveLength(6);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("6 of 6 done today");
  });

  it("offers today's debate apart from the lineup, by category", () => {
    render(<Today dayNumber={DAY} debateCategory="Fast food chains" />);

    const debate = screen.getByTestId("home-debate");
    expect(debate).toHaveTextContent("Today's debate");
    expect(debate).toHaveTextContent("Fast food chains");
    expect(within(debate).getByRole("link", { name: "Rank it →" })).toHaveAttribute("href", "/hot-takes");
  });

  it("switches the debate panel to your takes once ranked, with its streak", () => {
    streaks = streaksWithPlayed(["hot-takes"]);
    render(<Today dayNumber={DAY} debateCategory="Fast food chains" />);

    const debate = screen.getByTestId("home-debate");
    expect(debate).toHaveTextContent("You've ranked it.");
    expect(debate).toHaveTextContent("🔥 3");
    expect(within(debate).getByRole("link", { name: "See your takes →" })).toHaveAttribute("href", "/hot-takes");
    expect(screen.getByTestId("home-progress")).toHaveTextContent("6 new puzzles today");
  });

  it("leaves out the category when it is missing or from a cached earlier day", () => {
    const { unmount } = render(<Today dayNumber={DAY} debateCategory={null} />);
    expect(screen.getByTestId("home-debate")).toHaveTextContent("Today's debate is ready");
    unmount();

    render(<Today dayNumber={DAY - 1} debateCategory="Yesterday's list" />);
    expect(screen.getByTestId("home-debate")).toHaveTextContent("Today's debate is ready");
    expect(screen.getByTestId("home-debate")).not.toHaveTextContent("Yesterday's list");
  });

  it("tracks a click on the debate panel", async () => {
    vi.useRealTimers();
    render(<Today dayNumber={dailyDayNumber()} debateCategory="Fast food chains" />);

    const link = within(screen.getByTestId("home-debate")).getByRole("link");
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);

    expect(track).toHaveBeenCalledWith("home_game_clicked", {
      game: "hot-takes",
      slot: "debate",
      position: 0,
      played_today: false,
    });
  });

  it("corrects a stale server day number after mount", () => {
    render(<Today dayNumber={DAY - 1} debateCategory="Fast food chains" />);

    expect(screen.getByTestId("home-featured")).toHaveTextContent(
      getGame(featuredGameForDay(DAY)).name,
    );
  });

  it("tracks a click on the featured game", async () => {
    vi.useRealTimers();
    const day = dailyDayNumber();
    render(<Today dayNumber={day} debateCategory="Fast food chains" />);

    const link = within(screen.getByTestId("home-featured")).getByRole("link");
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);

    expect(track).toHaveBeenCalledWith("home_game_clicked", {
      game: featuredGameForDay(day),
      slot: "featured",
      position: 0,
      played_today: false,
    });
  });
});
