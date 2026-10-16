import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/chainlink/admin-guard", () => ({ checkAdmin: vi.fn(async () => ({ email: "j@x.com" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/ball-knowledge/schedule-service", () => ({
  listRetiredCategories: vi.fn(async () => ["NBA MVPs"]),
  unretireCategory: vi.fn(async () => {}),
}));

import { unretireCategory } from "@/lib/ball-knowledge/schedule-service";
import { DELETE, GET } from "@/app/api/admin/ball-knowledge/retired/route";

describe("ball knowledge retired route", () => {
  it("lists retired categories", async () => {
    expect(await (await GET()).json()).toEqual({ retired: ["NBA MVPs"] });
  });

  it("un-retires a category", async () => {
    const res = await DELETE(
      new Request("https://x.test", { method: "DELETE", body: JSON.stringify({ category: "NBA MVPs" }) }),
    );
    expect(res.status).toBe(200);
    expect(unretireCategory).toHaveBeenCalledWith(expect.anything(), "NBA MVPs");
  });

  it("requires a category", async () => {
    const res = await DELETE(new Request("https://x.test", { method: "DELETE", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
