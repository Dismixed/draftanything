import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ChainlinkGame from "@/components/chainlink/game";
import { useChainlinkStore } from "@/lib/chainlink/store";

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("@/components/chainlink/intro", () => ({
  ChainlinkIntro: ({ onPlay }: { onPlay: () => void }) => <button onClick={onPlay}>Start chain</button>,
}));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("starts timing when Play is clicked instead of when the puzzle loaded", () => {
  const now = 123456;
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.spyOn(useChainlinkStore.persist, "hasHydrated").mockReturnValue(true);
  useChainlinkStore.setState({
    puzzleWords: ["snow", "ball"], wordStatuses: ["solved", "active"],
    wordAttempts: [[], []], revealedLetters: [[false, false, false, false], [false, false, false, false]],
    gameStatus: "playing", loading: false, loadError: null, startTime: 1,
    initPuzzle: vi.fn().mockResolvedValue(undefined),
  });
  render(<ChainlinkGame mode="daily" />);
  fireEvent.click(screen.getByRole("button", { name: "Start chain" }));
  expect(useChainlinkStore.getState().startTime).toBe(now);
});
