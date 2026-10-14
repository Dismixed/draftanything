import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/daily-intro/count-service", () => ({ introCount: vi.fn(async () => 1240) }));

import { GET } from "@/app/api/daily-intro/count/route";
import { introCount } from "@/lib/daily-intro/count-service";

const get = (query: string) => GET(new Request(`https://example.test/api/daily-intro/count${query}`));

describe("/api/daily-intro/count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers with today's count and lets the CDN share it", async () => {
    const res = await get("?game=chainlink");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 1240 });
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(introCount).toHaveBeenCalledWith(expect.anything(), "chainlink", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("passes a null count through", async () => {
    vi.mocked(introCount).mockResolvedValueOnce(null);

    expect(await (await get("?game=hot-takes")).json()).toEqual({ count: null });
  });

  it("rejects a game that is not a daily", async () => {
    expect((await get("?game=draft-anything")).status).toBe(400);
    expect((await get("")).status).toBe(400);
    expect(introCount).not.toHaveBeenCalled();
  });

  it("answers 503 when counting fails", async () => {
    vi.mocked(introCount).mockRejectedValueOnce(new Error("db down"));

    expect((await get("?game=anyguessr")).status).toBe(503);
  });
});
