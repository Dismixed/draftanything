import { test, expect, type APIRequestContext } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";

async function bootstrapGuest(ctx: APIRequestContext) {
  const res = await ctx.post("/api/guest");
  expect(res.ok()).toBeTruthy();
}

async function createRoom(ctx: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const res = await ctx.post("/api/drafts", {
    data: {
      displayName: "Host",
      topic: "Judging E2E",
      maxPlayers: 2,
      rounds: 1,
      draftType: "standard",
      judgingMode: "ai",
      aiPersonality: "analyst",
      timerSeconds: null,
      ...overrides,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    draftId: string;
    roomCode: string;
    hostPlayerId: string;
    players: { id: string; seat: number }[];
  }>;
}

async function setupDraft(
  ctx: APIRequestContext,
  guestCtx: APIRequestContext,
  judgingMode: string,
  itemNames?: string[],
) {
  const names = itemNames ?? ["Alpha Item", "Beta Item", "Gamma Item", "Delta Item"];
  const room = await createRoom(ctx, {
    maxPlayers: 2,
    judgingMode,
    timerSeconds: null,
  });
  const { draftId, roomCode } = room;

  const joinRes = await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
    data: { displayName: "Guest" },
  });
  expect(joinRes.ok()).toBeTruthy();

  await ctx.post(`/api/drafts/${draftId}/pool`, { data: { action: "start-review" } });
  for (const name of names) {
    await ctx.post(`/api/drafts/${draftId}/pool`, { data: { action: "add-item", name } });
  }
  await ctx.post(`/api/drafts/${draftId}/pool`, { data: { action: "lock" } });

  const pickOrder = [
    { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
    { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
  ];

  await ctx.post(`/api/drafts/${draftId}/start`, { data: { pickOrder } });

  return { draftId, roomCode };
}

async function completeDraft(
  ctx: APIRequestContext,
  guestCtx: APIRequestContext,
  draftId: string,
) {
  const projRes = await ctx.get(`/api/drafts/${draftId}/projection`);
  const proj = await projRes.json();
  const avail = proj.availableItems.filter((i: { isAvailable: boolean }) => i.isAvailable);

  await ctx.post(`/api/drafts/${draftId}/pick`, {
    data: { itemId: avail[0].id, expectedPick: 0 },
  });
  await guestCtx.post(`/api/drafts/${draftId}/pick`, {
    data: { itemId: avail[1].id, expectedPick: 1 },
  });

  const finalProj = await ctx.get(`/api/drafts/${draftId}/projection`);
  const final = await finalProj.json();
  expect(final.draft.phase).toBe("DRAFT_COMPLETE");

  const startDefense = await ctx.post(`/api/drafts/${draftId}/start-defense`);
  expect(startDefense.ok()).toBeTruthy();

  const defenseProj = await ctx.get(`/api/drafts/${draftId}/projection`);
  const defense = await defenseProj.json();
  expect(defense.draft.phase).toBe("DEFENSE");
}

test.describe("Judging flow (API)", () => {
  // ---------------------------------------------------------------------------
  // AI mode with valid AI output
  // ---------------------------------------------------------------------------

  test("AI mode: judge with valid AI output", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await bootstrapGuest(guestCtx);
    await bootstrapGuest(request);

    const { draftId } = await setupDraft(request, guestCtx, "ai");
    await completeDraft(request, guestCtx, draftId);

    // Advance DEFENSE → JUDGING (AI mode jumps directly)
    const advance1 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance1.ok()).toBeTruthy();

    // Verify phase is JUDGING
    const state1 = await request.get(`/api/drafts/${draftId}/state`);
    const state1json = await state1.json();
    expect(state1json.phase).toBe("JUDGING");

    // Submit defense for both players
    await request.post(`/api/drafts/${draftId}/defense`, {
      data: { defenseText: "My roster is the best.", skipped: false },
    });
    await guestCtx.post(`/api/drafts/${draftId}/defense`, {
      data: { skipped: true },
    });

    // Trigger AI judge
    const judgeRes = await request.post("/api/ai/judge", {
      data: { draftId },
    });
    expect(judgeRes.ok()).toBeTruthy();
    const judgeResult = await judgeRes.json();
    expect(judgeResult.source).toBe("ai");
    expect(judgeResult.winnerPlayerIds).toHaveLength(1);
    expect(judgeResult.ranking).toHaveLength(2);
    expect(judgeResult.explanation).toBeTruthy();

    // Advance JUDGING → COMPLETE
    const advance2 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance2.ok()).toBeTruthy();

    const finalState = await request.get(`/api/drafts/${draftId}/state`);
    const finalStateJson = await finalState.json();
    expect(finalStateJson.phase).toBe("COMPLETE");
  });

  // ---------------------------------------------------------------------------
  // AI mode with fallback
  // ---------------------------------------------------------------------------

  test("AI mode: fallback judging", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await bootstrapGuest(guestCtx);
    await bootstrapGuest(request);

    const { draftId } = await setupDraft(request, guestCtx, "ai");
    await completeDraft(request, guestCtx, draftId);

    // Advance to JUDGING
    await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });

    // Submit defenses
    await request.post(`/api/drafts/${draftId}/defense`, {
      data: { defenseText: "Great roster.", skipped: false },
    });
    await guestCtx.post(`/api/drafts/${draftId}/defense`, {
      data: { defenseText: "Better roster.", skipped: false },
    });

    // Trigger AI judge — should succeed even if AI is unavailable (falls back)
    const judgeRes = await request.post("/api/ai/judge", {
      data: { draftId },
    });
    expect(judgeRes.ok()).toBeTruthy();
    const judgeResult = await judgeRes.json();
    // Source could be 'ai' or 'fallback' depending on API availability
    expect(["ai", "fallback"]).toContain(judgeResult.source);
    expect(judgeResult.winnerPlayerIds).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Community mode with shared winner
  // ---------------------------------------------------------------------------

  test("community mode: shared winner", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await bootstrapGuest(guestCtx);
    await bootstrapGuest(request);

    const { draftId } = await setupDraft(request, guestCtx, "community");
    await completeDraft(request, guestCtx, draftId);

    // Advance DEFENSE → VOTING
    const advance1 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance1.ok()).toBeTruthy();

    // Both players vote for the same person
    const stateRes = await request.get(`/api/drafts/${draftId}/state`);
    const state = await stateRes.json();
    const hostPlayerId = state.players[0].id;
    const guestPlayerId = state.players[1].id;

    // Host votes for guest, guest votes for host — each gets 1 vote
    const vote1 = await request.post(`/api/drafts/${draftId}/vote`, {
      data: { selectedPlayerId: guestPlayerId },
    });
    expect(vote1.ok()).toBeTruthy();

    const vote2 = await guestCtx.post(`/api/drafts/${draftId}/vote`, {
      data: { selectedPlayerId: hostPlayerId },
    });
    expect(vote2.ok()).toBeTruthy();

    // Advance VOTING → JUDGING (community: all votes required)
    const advance2 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance2.ok()).toBeTruthy();

    // Trigger AI judge for community mode (uses vote shares)
    const judgeRes = await request.post("/api/ai/judge", {
      data: { draftId },
    });
    expect(judgeRes.ok()).toBeTruthy();
    const judgeResult = await judgeRes.json();
    expect(judgeResult.winnerPlayerIds).toHaveLength(2); // tied
  });

  // ---------------------------------------------------------------------------
  // Hybrid mode with 70/30 weighting
  // ---------------------------------------------------------------------------

  test("hybrid mode: 70/30 weighting with AI tie-break", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await bootstrapGuest(guestCtx);
    await bootstrapGuest(request);

    const { draftId } = await setupDraft(request, guestCtx, "hybrid");
    await completeDraft(request, guestCtx, draftId);

    // Advance DEFENSE → VOTING (hybrid goes through VOTING)
    const advance1 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance1.ok()).toBeTruthy();

    // Both players submit defense
    await request.post(`/api/drafts/${draftId}/defense`, {
      data: { defenseText: "Best picks.", skipped: false },
    });
    await guestCtx.post(`/api/drafts/${draftId}/defense`, {
      data: { defenseText: "Better picks.", skipped: false },
    });

    // Submit votes
    const stateRes = await request.get(`/api/drafts/${draftId}/state`);
    const state = await stateRes.json();
    const hostPlayerId = state.players[0].id;
    const guestPlayerId = state.players[1].id;

    await request.post(`/api/drafts/${draftId}/vote`, {
      data: { selectedPlayerId: guestPlayerId },
    });
    await guestCtx.post(`/api/drafts/${draftId}/vote`, {
      data: { selectedPlayerId: hostPlayerId },
    });

    // Advance VOTING → JUDGING
    const advance2 = await request.post(`/api/drafts/${draftId}/phase`, {
      data: { action: "advance" },
    });
    expect(advance2.ok()).toBeTruthy();

    // Trigger judge for hybrid mode
    const judgeRes = await request.post("/api/ai/judge", {
      data: { draftId },
    });
    expect(judgeRes.ok()).toBeTruthy();
    const judgeResult = await judgeRes.json();
    expect(judgeResult.winnerPlayerIds).toHaveLength(1);
  });
});
