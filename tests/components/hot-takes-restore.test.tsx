import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HotTakesGame from "@/components/hot-takes/game";
import { saveHotTakesPlayed } from "@/lib/hot-takes/storage";

vi.mock("@/components/hot-takes/intro", () => ({
  HotTakesIntro: ({ pending, onPlay }: { pending: boolean; onPlay: () => void }) => (
    <button hidden={pending} onClick={onPlay}>Start ranking</button>
  ),
}));
vi.mock("@/components/hot-takes/optimized-image", () => ({ HotTakesImage: () => null }));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

const category = {
  name: "Test category",
  items: [{ id: "one", label: "First pick", imageUrl: "/one.png" }],
};

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("Hot Takes saved ranking", () => {
  it("shows the intro for a fresh visit", () => {
    render(<HotTakesGame initialCategory={category} />);
    expect(screen.getByRole("button", { name: "Start ranking" })).toBeVisible();
  });

  it("restores locked placements and skips the intro", () => {
    saveHotTakesPlayed({ category: category.name, placements: { one: "S" } });
    const { container } = render(<HotTakesGame initialCategory={category} />);
    expect(screen.queryByText("Start ranking")).not.toBeInTheDocument();
    expect(container.querySelector('[data-drop-zone="S"]')).toHaveTextContent("First pick");
    expect(screen.getByText("Where you split from the crowd")).toBeInTheDocument();
    expect(container.querySelector(".hot-takes-game-area")).toHaveClass("is-locked");
  });

  it("hydrates the same first frame before restoring a saved ranking", async () => {
    const html = renderToString(<HotTakesGame initialCategory={category} />);
    saveHotTakesPlayed({ category: category.name, placements: { one: "A" } });
    expect(renderToString(<HotTakesGame initialCategory={category} />)).toBe(html);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <HotTakesGame initialCategory={category} />, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('[data-drop-zone="A"]')).toHaveTextContent("First pick");
    await act(async () => root!.unmount());
    container.remove();
  });
});
