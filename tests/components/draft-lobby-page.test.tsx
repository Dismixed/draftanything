import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("has three ways in: create, join and solo", () => {
    render(<DraftLobbyPage />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Create Room",
      "Join Room",
      "Solo",
    ]);
  });

  it("opens on the solo tab with the topic filled in and no timer or judging mode", () => {
    render(<DraftLobbyPage initialTab="solo" initialTopic="Best Heist Movies" />);
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector("#solo-topic")).toHaveValue("Best Heist Movies");
    expect(document.querySelector("#solo-opponents")).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Start solo draft" })).toBeInTheDocument();

    const panel = document.querySelector("#panel-solo")!;
    expect(panel.querySelector('input[name="timer"]')).toBeNull();
    expect(panel.textContent).not.toMatch(/judging mode/i);
  });

  it("switches to the solo tab on click", () => {
    render(<DraftLobbyPage />);
    fireEvent.click(screen.getByRole("tab", { name: "Solo" }));
    expect(document.querySelector("#panel-solo")).not.toHaveAttribute("hidden");
    expect(document.querySelector("#panel-create")).toHaveAttribute("hidden");
  });
});
