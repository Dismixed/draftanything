import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FreezeFramesIntro } from "@/components/freezeframes/intro";
import backup from "@/lib/freezeframes/seed-puzzle.json";

vi.mock("@/components/daily-intro/intro-meta", () => ({ IntroCount: () => null, IntroToday: () => null }));
vi.mock("@/lib/motion/use-reduced-motion", () => ({ useReducedMotion: () => false }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("never reveals the bundled backup puzzle in its demo reel", async () => {
  vi.useFakeTimers();
  const { container } = render(<FreezeFramesIntro pending={false} onPlay={vi.fn()} />);
  const backupAnswers = Object.values(backup).map((round) => round.answer);
  const backupImages = [backup.movie.img, backup.show.img, backup.album.img];
  const seen = new Set<string>();

  for (let second = 0; second < 22; second++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    const solved = container.querySelector(".ffi-ans.is-ok")?.textContent?.replace(" ✓", "");
    if (solved) {
      expect(backupAnswers).not.toContain(solved);
      seen.add(solved);
    }
  }

  expect(seen.size).toBe(4);
  for (const image of container.querySelectorAll(".ffi-pic img")) {
    for (const source of backupImages) expect(decodeURIComponent(image.getAttribute("src") ?? "")).not.toContain(source);
  }
});
