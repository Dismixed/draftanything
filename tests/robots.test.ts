import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots.txt", () => {
  const rules = [robots().rules].flat()[0]!;
  const disallow = [rules.disallow ?? []].flat();

  it("lets crawlers fetch the puzzle APIs the game pages render from", () => {
    // Blocking these made Google render "Couldn't load today's puzzle" and report soft 404s.
    for (const path of ["/api/", "/api/chain/daily", "/api/anyguessr/daily", "/api/freezeframes/daily"]) {
      expect(disallow.some((rule) => path.startsWith(rule))).toBe(false);
    }
  });

  it("still blocks admin and the paid AI endpoints", () => {
    expect(disallow).toEqual(expect.arrayContaining(["/admin/", "/api/admin/", "/api/ai/"]));
  });
});
