import { test, expect } from "@playwright/test";
import { createAdminClient } from "@/lib/supabase/admin";

test.describe("Results page", () => {
  test("shows not found for non-existent draft", async ({ page }) => {
    const response = await page.goto("/results/nonexistent-id");
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Draft not found")).toBeVisible();
  });

  test("image route returns 404 for non-existent draft", async ({ request }) => {
    const response = await request.get("/api/results/nonexistent-id/image");
    expect(response.status()).toBe(404);
  });
});

test.describe("Results image endpoint", () => {
  let draftId: string;

  test.beforeAll(async () => {
    // Create a minimal COMPLETE draft via admin client for image testing
    const db = createAdminClient();
    const { data: draft } = await db
      .from("drafts")
      .insert({
        room_code: "TESTRM",
        topic: "E2E Test Draft",
        phase: "COMPLETE",
        host_guest_id: "test-host",
        max_players: 2,
        rounds: 1,
        draft_type: "standard",
        judging_mode: "ai",
        ai_personality: "analyst",
        timer_seconds: null,
        pick_order: [],
        current_pick_index: 0,
        turn_deadline: null,
      })
      .select("id")
      .single();

    if (!draft) {
      throw new Error("Failed to create test draft");
    }
    draftId = draft.id;

    // Add a test player
    await db.from("draft_players").insert({
      draft_id: draftId,
      guest_id: "test-player-1",
      display_name: "Test Player",
      seat: 1,
      is_ready: true,
    });

    // Add judgment
    await db.from("judgments").insert({
      draft_id: draftId,
      source: "ai",
      player_scores: {},
      ranking: [],
      winner_player_ids: [],
      awards: {},
      explanation: "Test judgment",
      model: "test",
      idempotency_key: "e2e-test-key",
      prompt_version: "v1",
    });
  });

  test.afterAll(async () => {
    if (!draftId) return;
    const db = createAdminClient();
    // Cleanup test data
    await db.from("judgments").delete().eq("draft_id", draftId);
    await db.from("draft_players").delete().eq("draft_id", draftId);
    await db.from("drafts").delete().eq("id", draftId);
  });

  test("returns image/png content type", async ({ request }) => {
    const response = await request.get(`/api/results/${draftId}/image`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });

  test("returns Content-Disposition attachment when ?download=1", async ({ request }) => {
    const response = await request.get(
      `/api/results/${draftId}/image?download=1`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");
    expect(response.headers()["content-disposition"]).toContain(".png");
  });
});
