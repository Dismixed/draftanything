import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";

const fetchMock = vi.fn();
const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe("useDailyPercentile", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does nothing until it is enabled", () => {
    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: false, record: true }));

    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the finish when the game has just ended", async () => {
    fetchMock.mockResolvedValue(ok({ percentile: 64, source: "estimated", sample: 2, max: 4000 }));

    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: true, record: true }));

    await waitFor(() => expect(result.current).toEqual({ percentile: 64, max: 4000 }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/daily-finish",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ game: "freezeframes", score: 2200 }) }),
    );
  });

  it("only reads on a return visit", async () => {
    fetchMock.mockResolvedValue(ok({ percentile: 31, source: "measured", sample: 80, max: 500 }));

    const { result } = renderHook(() => useDailyPercentile("getting-warmer", 9, { enabled: true, record: false }));

    await waitFor(() => expect(result.current).toEqual({ percentile: 31, max: 500 }));
    expect(fetchMock).toHaveBeenCalledWith("/api/daily-finish?game=getting-warmer&score=9", expect.anything());
  });

  it.each([
    ["the server refuses", () => Promise.resolve({ ok: false, json: async () => ({ error: "UNAVAILABLE" }) })],
    ["the network fails", () => Promise.reject(new Error("offline"))],
    ["the answer has no percentile", () => Promise.resolve(ok({ sample: 3 }))],
  ])("stays null when %s", async (_name, respond) => {
    fetchMock.mockImplementation(respond);

    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: true, record: true }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBeNull();
  });
});

describe("finishCurve", () => {
  it("is null until there is a percentile", () => {
    expect(finishCurve("freezeframes", null)).toBeNull();
  });

  it("adds the axis labels for the game", () => {
    expect(finishCurve("freezeframes", { percentile: 64, max: 4000 })).toEqual({
      percentile: 64,
      lowLabel: "0",
      highLabel: "4,000",
    });
    expect(finishCurve("getting-warmer", { percentile: 31, max: 500 })).toEqual({
      percentile: 31,
      lowLabel: "most guesses",
      highLabel: "fewest",
    });
  });
});
