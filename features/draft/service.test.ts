import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("draft service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createAdminClient).mockReturnValue(mockDb as any);
  });

  it("startDraft builds pick order and calls start_draft RPC", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          max_players: 2,
          rounds: 1,
          draft_type: "standard",
          phase: "DRAFTING",
        },
        error: null,
      }),
    };
    mockDb.from.mockReturnValue(selectChain);
    mockDb.rpc.mockResolvedValue({ error: null });

    const { startDraft } = await import("./service");
    await startDraft("draft-1", "host-guest");

    expect(mockDb.rpc).toHaveBeenCalledWith("start_draft", {
      p_draft_id: "draft-1",
      p_guest_id: "host-guest",
      p_pick_order: [
        { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
        { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
      ],
    });
  });

  it("startDraft throws when draft is not in DRAFTING phase", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          max_players: 2,
          rounds: 1,
          draft_type: "standard",
          phase: "POOL_REVIEW",
        },
        error: null,
      }),
    };
    mockDb.from.mockReturnValue(selectChain);

    const { startDraft } = await import("./service");
    const { AppError } = await import("@/lib/errors");
    await expect(startDraft("draft-1", "host-guest")).rejects.toThrow(AppError);
    expect(mockDb.rpc).not.toHaveBeenCalled();
  });
});
