import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SeatList } from "@/components/lobby/player-seat";
import { LobbyConfigSummary } from "@/components/lobby/lobby-config-summary";
import type { RoomPlayer, RoomProjection } from "@/features/room/schema";

afterEach(cleanup);

const human: RoomPlayer = {
  id: "p1",
  displayName: "Josh",
  seat: 1,
  isReady: false,
  isHost: true,
  isBot: false,
};
const bot: RoomPlayer = {
  id: "b1",
  displayName: "Chalk",
  seat: 2,
  isReady: true,
  isHost: false,
  isBot: true,
};

describe("SeatList with AI drafters", () => {
  it("gives the host an add button on every empty seat", () => {
    const onAddBot = vi.fn();
    render(<SeatList players={[human]} maxPlayers={3} canManageBots onAddBot={onAddBot} />);

    const buttons = screen.getAllByRole("button", { name: "+ Add AI drafter" });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);
    expect(onAddBot).toHaveBeenCalledTimes(1);
  });

  it("shows other players an empty seat with no button", () => {
    render(<SeatList players={[human]} maxPlayers={2} />);
    expect(screen.queryByRole("button", { name: "+ Add AI drafter" })).toBeNull();
    expect(screen.getByText("Waiting for player…")).toBeTruthy();
  });

  it("tags an AI drafter and lets the host remove it", () => {
    const onRemoveBot = vi.fn();
    render(
      <SeatList players={[human, bot]} maxPlayers={2} canManageBots onRemoveBot={onRemoveBot} />,
    );

    expect(screen.getByLabelText("AI drafter")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove Josh" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove Chalk" }));
    expect(onRemoveBot).toHaveBeenCalledWith("b1");
  });

  it("does not offer removal to non-hosts, or a Ready badge on AI drafters", () => {
    render(<SeatList players={[human, bot]} maxPlayers={2} />);
    expect(screen.queryByRole("button", { name: "Remove Chalk" })).toBeNull();
    expect(screen.queryByLabelText("Ready")).toBeNull();
    expect(screen.getAllByLabelText("Host")).toHaveLength(1);
  });

  it("disables the controls while a change is in flight", () => {
    render(<SeatList players={[human, bot]} maxPlayers={3} canManageBots busy />);
    expect(
      (screen.getByRole("button", { name: "+ Add AI drafter" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Remove Chalk" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe("LobbyConfigSummary judging note", () => {
  const room = (players: RoomPlayer[], judgingMode: RoomProjection["judgingMode"]) =>
    ({
      draftId: "d",
      roomCode: "ABC234",
      topic: "T",
      maxPlayers: 3,
      rounds: 2,
      timerSeconds: null,
      draftType: "snake",
      pickingMode: "pool",
      judgingMode,
      aiPersonality: "analyst",
      customJudgePrompt: null,
      phase: "LOBBY",
      players,
      hostPlayerId: "p1",
    }) satisfies RoomProjection;

  const note = "With one human player, the AI judge decides.";

  it("explains the AI judge when one person plays AI drafters", () => {
    render(<LobbyConfigSummary room={room([human, bot], "community")} playerCount={2} />);
    expect(screen.getByText(note)).toBeTruthy();
  });

  it("stays quiet while a lone host is still waiting for friends", () => {
    render(<LobbyConfigSummary room={room([human], "community")} playerCount={1} />);
    expect(screen.queryByText(note)).toBeNull();
  });

  it("stays quiet when judging is already AI or two people are in", () => {
    render(<LobbyConfigSummary room={room([human, bot], "ai")} playerCount={2} />);
    expect(screen.queryByText(note)).toBeNull();
    cleanup();
    const second = { ...human, id: "p2", displayName: "Sam", seat: 3, isHost: false };
    render(<LobbyConfigSummary room={room([human, bot, second], "hybrid")} playerCount={3} />);
    expect(screen.queryByText(note)).toBeNull();
  });
});
