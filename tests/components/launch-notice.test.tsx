import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchNotice } from "@/components/launch-notice/launch-notice";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function show(path: string) {
  pathname = path;
  const view = render(<LaunchNotice />);
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  return view;
}

describe("LaunchNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    vi.setSystemTime(new Date("2026-11-18T15:00:00Z"));
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("pops up once on the home page, and stays closed after Maybe later", () => {
    const { unmount } = show("/");
    expect(screen.getByTestId("launch-popup")).toHaveTextContent("Dead Reckoning");
    expect(screen.getByRole("link", { name: "Play today's voyage →" })).toHaveAttribute("href", "/dead-reckoning");

    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(screen.queryByTestId("launch-popup")).toBeNull();
    unmount();

    show("/");
    expect(screen.queryByTestId("launch-popup")).toBeNull();
  });

  it("closes on Escape", () => {
    show("/");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("launch-popup")).toBeNull();
  });

  it("shows the banner on a game the visit started on, until it is closed", () => {
    const { unmount } = show("/chainlink");
    const banner = screen.getByTestId("launch-banner");
    expect(banner).toHaveTextContent("Dead Reckoning");
    expect(screen.getByRole("link", { name: "Set sail →" })).toHaveAttribute("href", "/dead-reckoning");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("launch-banner")).toBeNull();
    unmount();

    show("/brain-dead");
    expect(screen.queryByTestId("launch-banner")).toBeNull();
  });

  it("shows no banner on a game reached from the home page", () => {
    sessionStorage.setItem("stim-entry-path", "/");
    show("/chainlink");
    expect(screen.queryByTestId("launch-banner")).toBeNull();
  });

  it("ends for good once Dead Reckoning is opened", () => {
    const { unmount } = show("/dead-reckoning");
    expect(screen.queryByTestId("launch-popup")).toBeNull();
    unmount();

    show("/");
    expect(screen.queryByTestId("launch-popup")).toBeNull();
  });

  it("stays away from anyone who has already played it", () => {
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({ version: 1, games: { "dead-reckoning": { playDates: ["2026-11-17"] } } }),
    );
    show("/");
    expect(screen.queryByTestId("launch-popup")).toBeNull();
  });
});
