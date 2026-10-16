import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/chainlink/admin-guard", () => ({ checkAdmin: vi.fn(async () => ({ email: "j@x.com" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/daily-review/adapters", () => ({ createReviewContext: () => ({}) }));
vi.mock("@/lib/daily-review/service", async () => {
  const { ReviewError } = await import("@/lib/daily-review/types");
  return {
    getReviewGrid: vi.fn(async () => ({ today: "2026-10-15", dates: [], columns: [] })),
    summarize: vi.fn(() => ({ total: 0, byGame: [] })),
    listAlternates: vi.fn(async () => []),
    approve: vi.fn(async () => {}),
    swap: vi.fn(async () => {
      throw new ReviewError("LOCKED");
    }),
  };
});

import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { approve, listAlternates } from "@/lib/daily-review/service";
import { GET } from "@/app/api/admin/daily-review/route";
import { GET as alternatesGet } from "@/app/api/admin/daily-review/alternates/route";
import { POST as approvePost } from "@/app/api/admin/daily-review/approve/route";
import { POST as swapPost } from "@/app/api/admin/daily-review/swap/route";

const post = (body: unknown) =>
  new Request("https://example.test", { method: "POST", body: JSON.stringify(body) });

afterEach(() => vi.clearAllMocks());

describe("daily review routes", () => {
  it("refuses non-admins", async () => {
    vi.mocked(checkAdmin).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(403);
  });

  it("approves with the session email, ignoring any email in the body", async () => {
    const res = await approvePost(
      post({ items: [{ game: "hot-takes", date: "2026-10-16", contentId: "a" }], email: "evil@x.com" }),
    );
    expect(res.status).toBe(200);
    expect(approve).toHaveBeenCalledWith(expect.anything(), {
      game: "hot-takes",
      date: "2026-10-16",
      contentId: "a",
      email: "j@x.com",
    });
  });

  it("rejects an unknown game", async () => {
    const res = await approvePost(post({ items: [{ game: "anyguessr", date: "2026-10-16", contentId: "a" }] }));
    expect(res.status).toBe(400);
  });

  it("requires the content the admin saw when approving", async () => {
    const res = await approvePost(post({ items: [{ game: "hot-takes", date: "2026-10-16" }] }));
    expect(res.status).toBe(400);
  });

  it("requires the current pick the admin saw when swapping", async () => {
    const res = await swapPost(post({ game: "hot-takes", date: "2026-10-16", contentId: "b" }));
    expect(res.status).toBe(400);
  });

  it("returns every alternate when asked for all", async () => {
    await alternatesGet(new Request("https://x.test/?game=hot-takes&date=2026-10-16&all=1"));
    expect(listAlternates).toHaveBeenCalledWith(expect.anything(), "hot-takes", "2026-10-16", undefined, Infinity);
  });

  it("maps a locked swap to 409", async () => {
    const res = await swapPost(post({ game: "hot-takes", date: "2026-10-15", contentId: "b", currentId: "a" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "LOCKED" });
  });
});
