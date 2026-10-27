import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Results from "@/components/anyguessr/results";
import { track } from "@/lib/analytics/track";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import type { ClientDailyRound, DailyRoundResult } from "@/lib/anyguessr/types";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("@/components/anyguessr/clue-card", () => ({
  default: ({ label }: { label?: string }) => <div data-testid="clue">{label}</div>,
}));

const ANSWERS = ["Chad", "Peru", "Laos"];

const dailyRounds: ClientDailyRound[] = ANSWERS.map((_, i) => ({
  roundIndex: i,
  puzzleId: `p${i}`,
  clueType: "flag",
  clue: { type: "flag", content: "" },
}));

const roundResults: DailyRoundResult[] = ANSWERS.map((answer, i) => ({
  roundIndex: i,
  clueType: "flag",
  puzzleId: `p${i}`,
  guess: answer,
  answer,
  distanceKm: 0,
  roundScore: 100,
  exact: true,
}));

const toggle = () => screen.queryByRole("button", { name: /every round|hide the rounds/i });

describe("AnyGuessr results, round review", () => {
  beforeEach(() => {
    vi.mocked(track).mockReset();
    useAnyGuessrStore.setState({ status: "won", dailyRounds, roundResults, totalScore: 300 });
  });

  afterEach(cleanup);

  it("shows the first round's review with no toggle by default", () => {
    render(<Results embedded />);

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Round 1");
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
    expect(toggle()).toBeNull();
  });

  it("folds the review away when asked, keeping the score and the stamps", () => {
    render(<Results embedded foldRounds />);

    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getAllByRole("tab").every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(true);
    expect(screen.getByText("3 exact · 0 close · 0 far off")).toBeInTheDocument();
    expect(toggle()).toHaveTextContent("See every round");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the review from the toggle, and folds it again", () => {
    render(<Results embedded foldRounds />);

    fireEvent.click(toggle()!);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Round 1");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("anyguessr_rounds_review_opened", { via: "toggle" });

    fireEvent.click(toggle()!);
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("opens the review at the stamp that was tapped", () => {
    render(<Results embedded foldRounds />);

    fireEvent.click(screen.getAllByRole("tab")[2]);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Round 3");
    expect(track).toHaveBeenCalledWith("anyguessr_rounds_review_opened", { via: "stamp" });

    // Moving between rounds once it is open is not another open.
    fireEvent.click(screen.getAllByRole("tab")[0]);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Round 1");
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("never folds a review the player is already looking at", () => {
    const { rerender } = render(<Results embedded />);
    rerender(<Results embedded foldRounds />);

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(toggle()).toBeNull();
  });
});
