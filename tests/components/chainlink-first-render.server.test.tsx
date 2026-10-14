// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audio/sound-context", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/motion/confetti", () => ({ fireConfetti: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

describe("Chain Link first render on the server", () => {
  it("renders the hidden intro, the same thing the browser draws first", async () => {
    const { default: ChainlinkGame } = await import("@/components/chainlink/game");

    const html = renderToString(<ChainlinkGame mode="daily" />);

    // The intro is drawn hidden until saved progress has been read.
    expect(html).toContain("data-intro-pending");
    expect(html).not.toContain("game-shell");
  });
});
