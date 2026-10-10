import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("DraftLobbyPage", () => {
  afterEach(cleanup);

  it("opens on the create tab by default, with a link back to the landing page", () => {
    render(<DraftLobbyPage />);
    expect(screen.getByRole("tab", { name: /create room/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /draft anything/i })).toHaveAttribute("href", "/draft-anything");
  });

  it("fills the topic it is given", () => {
    render(<DraftLobbyPage initialTopic="Ultimate Comfort Foods" />);
    expect(document.querySelector("#create-topic")).toHaveValue("Ultimate Comfort Foods");
  });

  it("opens on the join tab with the code filled in", () => {
    render(<DraftLobbyPage initialTab="join" initialRoomCode="abcde2" />);
    expect(screen.getByRole("tab", { name: /join room/i })).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector("#join-room-code")).toHaveValue("ABCDE2");
  });
});
