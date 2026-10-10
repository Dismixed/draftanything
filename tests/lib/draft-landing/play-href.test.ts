import { describe, expect, it } from "vitest";
import { parsePlayParams, playHref } from "@/lib/draft-landing/play-href";

describe("playHref", () => {
  it("builds the bare, join, topic and code addresses", () => {
    expect(playHref()).toBe("/draft-anything/play");
    expect(playHref({ tab: "create" })).toBe("/draft-anything/play");
    expect(playHref({ tab: "join" })).toBe("/draft-anything/play?tab=join");
    expect(playHref({ topic: "Ultimate Comfort Foods" })).toBe("/draft-anything/play?topic=Ultimate+Comfort+Foods");
    expect(playHref({ code: "abcde2" })).toBe("/draft-anything/play?code=ABCDE2");
  });

  it("round-trips topics with awkward characters", () => {
    for (const topic of ["Things You'd Bring to a Desert Island", "Rock & Roll?", "50% off #1"]) {
      const query = playHref({ topic }).split("?")[1];
      const params = Object.fromEntries(new URLSearchParams(query));
      expect(parsePlayParams(params).topic).toBe(topic);
    }
  });
});

describe("parsePlayParams", () => {
  it("defaults to the create tab with nothing filled in", () => {
    expect(parsePlayParams({})).toEqual({ tab: "create", topic: "", code: "" });
    expect(parsePlayParams({ tab: "nonsense" })).toEqual({ tab: "create", topic: "", code: "" });
  });

  it("opens the join tab for tab=join or any code", () => {
    expect(parsePlayParams({ tab: "join" }).tab).toBe("join");
    expect(parsePlayParams({ code: " abcde2 " })).toEqual({ tab: "join", topic: "", code: "ABCDE2" });
  });

  it("trims and cuts the topic to 80 characters", () => {
    expect(parsePlayParams({ topic: "   " }).topic).toBe("");
    expect(parsePlayParams({ topic: "  Best Films  " }).topic).toBe("Best Films");
    expect(parsePlayParams({ topic: "x".repeat(200) }).topic).toHaveLength(80);
  });

  it("uses the first of repeated values", () => {
    expect(parsePlayParams({ topic: ["a", "b"], code: ["one", "two"], tab: ["join", "create"] })).toEqual({
      tab: "join",
      topic: "a",
      code: "ONE",
    });
  });
});
