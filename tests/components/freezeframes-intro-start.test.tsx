import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FreezeFramesGame from "@/components/freezeframes/game";

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/motion/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/lib/games/use-daily-percentile", () => ({ finishCurve: () => null, useDailyPercentile: () => null }));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
vi.mock("@/lib/freezeframes/storage", () => ({ getDailyPlayed: () => null, getSubmittedEntryId: () => null, saveDailyPlayed: vi.fn(), saveLeaderboardEntry: vi.fn() }));
vi.mock("@/components/freezeframes/intro", () => ({ FreezeFramesIntro: ({ onPlay }: { onPlay: () => void }) => <button onClick={onPlay}>Roll it</button> }));
vi.mock("next/image", () => ({ default: () => null }));

const puzzle = { date: "2026-10-14", rounds: { movie: { img: "/demo.jpg" }, song: { audio: "", artist: "demo" }, show: { img: "/demo.jpg" }, album: { img: "/demo.jpg" } } };

describe("FreezeFrames starting from its intro", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => null })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("keeps Play available after loading fails, and can retry successfully", async () => {
    render(<FreezeFramesGame />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Roll it" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Roll it" })).toBeInTheDocument();
    expect(screen.getByText(/Could not load today's FreezeFrames/)).toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => puzzle } as Response);
    fireEvent.click(screen.getByRole("button", { name: "Roll it" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Roll it" })).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText("Movie title")).toBeInTheDocument();
  });
});
