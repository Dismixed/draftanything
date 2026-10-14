import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

import { track } from "@/lib/analytics/track";
import { useDailyIntro } from "@/lib/daily-intro/use-daily-intro";
import { useIntroCount } from "@/lib/daily-intro/use-intro-count";

describe("useDailyIntro", () => {
  afterEach(cleanup);

  it("is checking until the game has read its saved state", () => {
    const { result } = renderHook(() => useDailyIntro("chainlink", { ready: false, skip: false }));
    expect(result.current.phase).toBe("checking");
  });

  it("shows the intro for an untouched daily, and the game once Play is pressed", () => {
    const { result } = renderHook(() => useDailyIntro("chainlink", { ready: true, skip: false }));
    expect(result.current.phase).toBe("intro");

    act(() => result.current.play());

    expect(result.current.phase).toBe("game");
    expect(track).toHaveBeenCalledWith("daily_intro_play_clicked", { game: "chainlink" });
  });

  it("goes straight to the game when today's puzzle is in progress or finished", () => {
    const { result } = renderHook(() => useDailyIntro("hot-takes", { ready: true, skip: true }));
    expect(result.current.phase).toBe("game");
  });

  it("stays in the game after Play even once the game reports progress", () => {
    const { result, rerender } = renderHook(({ skip }) => useDailyIntro("chainlink", { ready: true, skip }), {
      initialProps: { skip: false },
    });
    act(() => result.current.play());
    rerender({ skip: true });
    expect(result.current.phase).toBe("game");
  });
});

describe("useIntroCount", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reads today's count", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ count: 1240 }) });

    const { result } = renderHook(() => useIntroCount("freezeframes"));

    await waitFor(() => expect(result.current).toBe(1240));
    expect(fetchMock).toHaveBeenCalledWith("/api/daily-intro/count?game=freezeframes");
  });

  it("stays null below the floor and when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ count: null }) });
    const below = renderHook(() => useIntroCount("anyguessr"));

    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const failed = renderHook(() => useIntroCount("brain-dead"));

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const offline = renderHook(() => useIntroCount("chainlink"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(below.result.current).toBeNull();
    expect(failed.result.current).toBeNull();
    expect(offline.result.current).toBeNull();
  });
});
