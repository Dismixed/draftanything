import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareResult } from "@/components/daily/share-result";
import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

function setPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia;
}

describe("ShareResult", () => {
  beforeEach(() => {
    vi.mocked(track).mockReset();
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the text on a computer and confirms it", async () => {
    const user = userEvent.setup();
    setPointer(false);
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<ShareResult gameId="chainlink" text="Chain Link · Oct 6" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(writeText).toHaveBeenCalledWith("Chain Link · Oct 6");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("result_shared", { game: "chainlink", method: "copy" });
  });

  it("opens the share sheet on a touch device", async () => {
    const user = userEvent.setup();
    setPointer(true);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareResult gameId="hot-takes" text="Hot Takes · Pizza toppings" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(share).toHaveBeenCalledWith({ text: "Hot Takes · Pizza toppings" });
    expect(track).toHaveBeenCalledWith("result_shared", { game: "hot-takes", method: "share" });
  });

  it("does not count a share the person cancelled", async () => {
    const user = userEvent.setup();
    setPointer(true);
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareResult gameId="hot-takes" text="x" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(track).not.toHaveBeenCalled();
  });
});
