import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import {
  BOT_PICK_HOST_DELAY_MS,
  BOT_PICK_OTHER_DELAY_MS,
  BOT_PICK_RETRY_MS,
  useBotTurns,
} from "./use-bot-turns";

const fetchMock = vi.fn();
const ok = () => Promise.resolve({ ok: true } as Response);

type Props = { active: boolean; pickIndex: number; isHost: boolean };

const setup = (initial: Props, onPicked = vi.fn()) => {
  const hook = renderHook(
    (props: Props) => useBotTurns({ draftId: "d1", onPicked, ...props }),
    { initialProps: initial },
  );
  return { ...hook, onPicked };
};

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockImplementation(ok);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useBotTurns", () => {
  it("the host asks for the pick after a short thinking pause", async () => {
    const { onPicked } = setup({ active: true, pickIndex: 3, isHost: true });

    await vi.advanceTimersByTimeAsync(BOT_PICK_HOST_DELAY_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drafts/d1/bot-pick",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ expectedPick: 3 }) }),
    );
    expect(onPicked).toHaveBeenCalledTimes(1);
  });

  it("everyone else waits longer, covering for a host who has gone", async () => {
    setup({ active: true, pickIndex: 0, isHost: false });

    await vi.advanceTimersByTimeAsync(BOT_PICK_OTHER_DELAY_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when it is not an AI drafter's turn", async () => {
    setup({ active: false, pickIndex: 0, isHost: true });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps asking while the turn has not changed, whatever the answer", async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.reject(new Error("offline")))
      .mockImplementationOnce(() => Promise.resolve({ ok: false } as Response))
      .mockImplementation(ok);
    const { onPicked } = setup({ active: true, pickIndex: 1, isHost: true });

    await vi.advanceTimersByTimeAsync(BOT_PICK_HOST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onPicked).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BOT_PICK_RETRY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onPicked).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(BOT_PICK_RETRY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onPicked).toHaveBeenCalledTimes(1);
  });

  it("starts over when the turn changes before the pause ends", async () => {
    const { rerender } = setup({ active: true, pickIndex: 1, isHost: true });

    await vi.advanceTimersByTimeAsync(BOT_PICK_HOST_DELAY_MS - 100);
    rerender({ active: true, pickIndex: 2, isHost: true });

    await vi.advanceTimersByTimeAsync(BOT_PICK_HOST_DELAY_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ expectedPick: 2 }));
  });

  it("stops once a human is on the clock", async () => {
    const { rerender } = setup({ active: true, pickIndex: 1, isHost: true });
    await vi.advanceTimersByTimeAsync(BOT_PICK_HOST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ active: false, pickIndex: 2, isHost: true });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops when the board is closed", async () => {
    const { unmount } = setup({ active: true, pickIndex: 1, isHost: true });
    unmount();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
