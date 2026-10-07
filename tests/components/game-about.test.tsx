import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameAbout } from "@/components/games/game-about";
import { GAME_CONTENT } from "@/lib/games/content";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("GameAbout", () => {
  afterEach(cleanup);

  it("renders the intro, sections and questions as details", () => {
    const content = GAME_CONTENT["hot-takes"]!;
    const { container } = render(<GameAbout gameId="hot-takes" />);

    expect(screen.getByRole("heading", { level: 2, name: "About Hot Takes" })).toBeInTheDocument();
    expect(screen.getByText(content.intro)).toBeInTheDocument();

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(content.sections.length + content.faq.length);
    expect(details[0]).toHaveAttribute("open");
    expect(details[0].querySelector("summary")).toHaveTextContent("How to play");
    for (const detail of Array.from(details).slice(1)) expect(detail).not.toHaveAttribute("open");
  });

  it("links to three other dailies and back to the home page", () => {
    render(<GameAbout gameId="hot-takes" />);

    const more = screen.getByTestId("game-about-more");
    expect(within(more).getAllByRole("link")).toHaveLength(3);
    expect(within(more).queryByText("Hot Takes")).toBeNull();
    expect(screen.getByRole("link", { name: /all stim games/i })).toHaveAttribute("href", "/");
  });

  it("includes FAQ structured data", () => {
    const { container } = render(<GameAbout gameId="hot-takes" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('"FAQPage"');
  });
});
