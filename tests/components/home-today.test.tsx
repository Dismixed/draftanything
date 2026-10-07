import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Today } from "@/components/home/today";
import { track } from "@/lib/analytics/track";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { featuredGameForDay, utcDayNumber } from "@/lib/games/today";
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
const DAY = utcDayNumber(NOW);

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

  it("shows the day's featured game and six lineup cards for a first-time visitor", () => {
    render(<Today dayNumber={DAY} />);

    const featured = getGame(featuredGameForDay(DAY));
    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Today's featured game");
    expect(slot).toHaveTextContent(featured.name);
    expect(within(slot).getByRole("link")).toHaveAttribute("href", featured.playHref);

    expect(within(screen.getByTestId("home-lineup")).getAllByRole("link")).toHaveLength(6);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("7 new puzzles today");
  });

  it("features the next unplayed game and counts what is done", () => {
    const first = featuredGameForDay(DAY);
    const second = featuredGameForDay(DAY + 1);
    streaks = streaksWithPlayed([first, "hot-takes"]);

    render(<Today dayNumber={DAY} />);

    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Up next");
    expect(slot).toHaveTextContent(getGame(second).name);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("2 of 7 done today");

    const cards = within(screen.getByTestId("home-lineup")).getAllByRole("link");
    expect(cards).toHaveLength(6);
    expect(cards[4]).toHaveTextContent("Done today");
    expect(cards[5]).toHaveTextContent("Done today");
    expect(cards[0]).not.toHaveTextContent("Done today");
  });

  it("shows the all-done state with a countdown when every daily is played", () => {
    streaks = streaksWithPlayed([...DAILY_GAMES]);

    render(<Today dayNumber={DAY} />);

    expect(screen.queryByTestId("home-featured")).toBeNull();
    const done = screen.getByTestId("home-all-done");
    expect(done).toHaveTextContent("All seven done.");
    expect(done).toHaveTextContent("New puzzles in 8h 37m");
    expect(within(done).getByRole("link")).toHaveAttribute("href", "/draft-anything");
    expect(within(screen.getByTestId("home-lineup")).getAllByRole("link")).toHaveLength(7);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("7 of 7 done today");
  });

  it("corrects a stale server day number after mount", () => {
    render(<Today dayNumber={DAY - 1} />);

    expect(screen.getByTestId("home-featured")).toHaveTextContent(
      getGame(featuredGameForDay(DAY)).name,
    );
  });

  it("tracks a click on the featured game", async () => {
    vi.useRealTimers();
    const day = utcDayNumber();
    render(<Today dayNumber={day} />);

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
