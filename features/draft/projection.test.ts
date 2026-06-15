import { describe, it, expect } from "vitest";
import { buildProjection } from "./projection";

describe("buildProjection", () => {
  const draftRow = {
    id: "draft-1",
    room_code: "ABC123",
    topic: "Test Draft",
    phase: "DRAFTING",
    host_guest_id: "guest-host",
    max_players: 3,
    rounds: 2,
    draft_type: "snake",
    judging_mode: "ai",
    ai_personality: "hype",
    timer_seconds: 60,
    pick_order: [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
      { overallPick: 3, round: 1, pickInRound: 3, seat: 3 },
    ],
    current_pick_index: 0,
    turn_deadline: "2026-06-15T13:00:00Z",
    rubric: {},
    created_at: "2026-06-15T12:00:00Z",
    completed_at: null,
  };

  const playerRows = [
    {
      id: "player-1",
      draft_id: "draft-1",
      guest_id: "guest-host",
      display_name: "Host",
      seat: 1,
      is_ready: true,
      removed_at: null,
      joined_at: "2026-06-15T12:00:00Z",
    },
    {
      id: "player-2",
      draft_id: "draft-1",
      guest_id: "guest-2",
      display_name: "Player2",
      seat: 2,
      is_ready: true,
      removed_at: null,
      joined_at: "2026-06-15T12:00:00Z",
    },
  ];

  const itemRows = [
    {
      id: "item-1",
      draft_id: "draft-1",
      name: "Item Alpha",
      normalized_name: "item alpha",
      source: "ai",
      hidden_metadata: { category: 5 },
      is_available: true,
      created_at: "2026-06-15T12:00:00Z",
    },
    {
      id: "item-2",
      draft_id: "draft-1",
      name: "Item Beta",
      normalized_name: "item beta",
      source: "manual",
      hidden_metadata: {},
      is_available: false,
      created_at: "2026-06-15T12:00:00Z",
    },
  ];

  const pickRows = [
    {
      id: "pick-1",
      draft_id: "draft-1",
      player_id: "player-1",
      item_id: "item-1",
      overall_pick: 1,
      round: 1,
      pick_in_round: 1,
      is_auto_pick: false,
      created_at: "2026-06-15T12:30:00Z",
    },
  ];

  const commentaryRows = [
    {
      id: "comment-1",
      draft_id: "draft-1",
      pick_id: "pick-1",
      personality: "hype",
      text: "Great pick!",
      trigger_tags: ["pick"],
      model: "gpt-4",
      prompt_version: "v1",
      idempotency_key: "key-1",
      created_at: "2026-06-15T12:30:01Z",
    },
  ];

  const serverNow = "2026-06-15T12:30:02Z";

  it("produces valid DraftRoomProjection", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      itemRows as unknown as Record<string, unknown>[],
      pickRows as unknown as Record<string, unknown>[],
      commentaryRows as unknown as Record<string, unknown>[],
      serverNow,
    );

    expect(result).toHaveProperty("draft");
    expect(result).toHaveProperty("players");
    expect(result).toHaveProperty("availableItems");
    expect(result).toHaveProperty("picks");
    expect(result).toHaveProperty("commentary");
    expect(result).toHaveProperty("serverNow");
  });

  it("maps draft correctly", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    expect(result.draft.id).toBe("draft-1");
    expect(result.draft.roomCode).toBe("ABC123");
    expect(result.draft.phase).toBe("DRAFTING");
    expect(result.draft.hostPlayerId).toBe("player-1");
    expect(result.draft.pickOrder).toHaveLength(3);
    expect(result.draft.pickOrder[0].seat).toBe(1);
    expect(result.draft.currentPickIndex).toBe(0);
    expect(result.draft.turnDeadline).toBe("2026-06-15T13:00:00Z");
    expect(result.draft.timerSeconds).toBe(60);
  });

  it("maps players correctly", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    expect(result.players).toHaveLength(2);
    expect(result.players[0].id).toBe("player-1");
    expect(result.players[0].displayName).toBe("Host");
    expect(result.players[0].isHost).toBe(true);
    expect(result.players[1].isHost).toBe(false);
  });

  it("maps items without hidden_metadata", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      itemRows as unknown as Record<string, unknown>[],
      [],
      [],
      serverNow,
    );

    expect(result.availableItems).toHaveLength(2);
    expect(result.availableItems[0]).not.toHaveProperty("hidden_metadata");
    expect(result.availableItems[0].name).toBe("Item Alpha");
    expect(result.availableItems[0].isAvailable).toBe(true);
    expect(result.availableItems[1].isAvailable).toBe(false);
  });

  it("maps picks correctly", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      itemRows as unknown as Record<string, unknown>[],
      pickRows as unknown as Record<string, unknown>[],
      [],
      serverNow,
    );

    expect(result.picks).toHaveLength(1);
    expect(result.picks[0].overallPick).toBe(1);
    expect(result.picks[0].isAutoPick).toBe(false);
    expect(result.picks[0].playerId).toBe("player-1");
  });

  it("maps commentary correctly", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      pickRows as unknown as Record<string, unknown>[],
      commentaryRows as unknown as Record<string, unknown>[],
      serverNow,
    );

    expect(result.commentary).toHaveLength(1);
    expect(result.commentary[0].text).toBe("Great pick!");
    expect(result.commentary[0].pickId).toBe("pick-1");
  });

  it("includes serverNow", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    expect(result.serverNow).toBe("2026-06-15T12:30:02Z");
  });

  it("handles null turn_deadline and timer_seconds", () => {
    const noTimerDraft = {
      ...draftRow,
      timer_seconds: null,
      turn_deadline: null,
    };

    const result = buildProjection(
      noTimerDraft as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    expect(result.draft.timerSeconds).toBeNull();
    expect(result.draft.turnDeadline).toBeNull();
  });

  it("identifies host player correctly", () => {
    const swappedRows = [
      {
        ...playerRows[1],
        guest_id: "guest-host",
        id: "player-host-2",
      },
      {
        ...playerRows[0],
        guest_id: "guest-other",
        id: "player-other",
      },
    ];

    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      swappedRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    expect(result.draft.hostPlayerId).toBe("player-host-2");
    expect(result.players.find((p) => p.isHost)?.id).toBe("player-host-2");
  });

  it("excludes removed_at and guest_id from safe outputs", () => {
    const result = buildProjection(
      draftRow as unknown as Record<string, unknown>,
      playerRows as unknown as Record<string, unknown>[],
      [],
      [],
      [],
      serverNow,
    );

    for (const player of result.players) {
      expect(player).not.toHaveProperty("removed_at");
      expect(player).not.toHaveProperty("guestId");
    }
    expect(result.draft).not.toHaveProperty("host_guest_id");
  });
});
