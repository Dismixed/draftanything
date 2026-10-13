import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraftLanding } from "@/components/draft-landing/landing";
import { HOT_CATEGORIES } from "@/components/lobby/hot-categories";
import { GAME_CONTENT } from "@/lib/games/content";
import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("DraftLanding", () => {
  afterEach(cleanup);

  it("offers start and join in the opening and again at the end", () => {
    render(<DraftLanding />);
    const starts = screen.getAllByRole("link", { name: "Start a draft" });
    const joins = screen.getAllByRole("link", { name: "Join a room" });
    expect(starts).toHaveLength(2);
    expect(joins).toHaveLength(2);
    for (const link of starts) expect(link).toHaveAttribute("href", "/draft-anything/play");
    for (const link of joins) expect(link).toHaveAttribute("href", "/draft-anything/play?tab=join");
  });

  it("links every draft idea to the room screen with its topic", () => {
    render(<DraftLanding />);
    const ideas = within(screen.getByTestId("dal-ideas")).getAllByRole("link");
    expect(ideas).toHaveLength(HOT_CATEGORIES.length);
    const island = ideas.find((link) => link.textContent?.includes("Desert Island"));
    expect(new URL(island!.getAttribute("href")!, "https://x.test").searchParams.get("topic")).toBe(
      "Things You'd Bring to a Desert Island",
    );
  });

  it("reports which button was clicked", () => {
    render(<DraftLanding />);
    fireEvent.click(screen.getAllByRole("link", { name: "Join a room" })[1]);
    expect(track).toHaveBeenCalledWith("draft_landing_cta_clicked", { cta: "join", position: "closing" });
  });

  it("offers solo play in the hero and the closing section", () => {
    render(<DraftLanding />);
    const solos = screen.getAllByRole("link", { name: "Play solo" });
    expect(solos).toHaveLength(2);
    solos.forEach((link) => expect(link).toHaveAttribute("href", "/draft-anything/play?tab=solo"));

    fireEvent.click(solos[0]);
    expect(track).toHaveBeenCalledWith("draft_landing_cta_clicked", { cta: "solo", position: "hero" });
  });

  it("says one person can play, in the eyebrow and the questions", () => {
    render(<DraftLanding />);
    expect(screen.getByText("Draft Anything · a party game for 1 to 6")).toBeInTheDocument();
    expect(screen.getByText("Can I play Draft Anything alone?")).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      "Can I play Draft Anything alone?",
    );
  });

  it("keeps the questions, the long-form text and one h1", () => {
    const content = GAME_CONTENT["draft-anything"];
    const { container } = render(<DraftLanding />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelectorAll("details")).toHaveLength(content.faq.length + content.sections.length - 1);
    expect(screen.getByText(content.faq[0].question)).toBeInTheDocument();
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /all stim games/i })).toHaveAttribute("href", "/");
  });
});
