// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/motion/confetti", () => ({ fireConfetti: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

describe("AnyGuessr first render on the server", () => {
  it("renders the hidden intro, the same thing the browser draws first", async () => {
    const { default: AnyGuessrGame } = await import("@/components/anyguessr/game");

    const html = renderToString(<AnyGuessrGame />);

    // The intro is drawn hidden until saved progress has been read.
    expect(html).toContain("data-intro-pending");
    expect(html).not.toContain("ag-map-layer");
    expect(html).not.toContain("ag-stamp");
  });
});
