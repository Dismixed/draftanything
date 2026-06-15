import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/features/ai/pool", () => ({
  generatePool: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("pool service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = { from: vi.fn(), rpc: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createAdminClient).mockReturnValue(mockDb as any);
  });

  it("startPoolReview calls RPC", async () => {
    mockDb.rpc.mockResolvedValue({ error: null });
    const { startPoolReview } = await import("./service");
    await startPoolReview("draft-1", "guest-1");
    expect(mockDb.rpc).toHaveBeenCalledWith("start_pool_review", {
      p_draft_id: "draft-1",
      p_guest_id: "guest-1",
    });
  });

  it("startPoolReview throws AppError on RPC error", async () => {
    mockDb.rpc.mockResolvedValue({ error: { message: "NOT_HOST" } });
    const { startPoolReview } = await import("./service");
    const { AppError } = await import("@/lib/errors");
    await expect(startPoolReview("draft-1", "guest-2")).rejects.toThrow(AppError);
  });

  it("lockPool calls RPC", async () => {
    mockDb.rpc.mockResolvedValue({ error: null });
    const { lockPool } = await import("./service");
    await lockPool("draft-1", "host-guest");
    expect(mockDb.rpc).toHaveBeenCalledWith("lock_pool", {
      p_draft_id: "draft-1",
      p_guest_id: "host-guest",
    });
  });

  it("lockPool throws on pool RPC error", async () => {
    mockDb.rpc.mockResolvedValue({ error: { message: "INSUFFICIENT_ITEMS" } });
    const { lockPool } = await import("./service");
    const { AppError } = await import("@/lib/errors");
    await expect(lockPool("draft-1", "guest-1")).rejects.toThrow(AppError);
  });

  it("normalizeItemName normalizes names", async () => {
    const { normalizeItemName } = await import("./normalize");
    expect(normalizeItemName("  The   Matrix  ")).toBe("the matrix");
  });

  it("poolTargetSize returns correct count", async () => {
    const { poolTargetSize } = await import("./normalize");
    expect(poolTargetSize(4, 3)).toBe(24);
  });
});
