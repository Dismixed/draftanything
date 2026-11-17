import { describe, expect, it } from "vitest";
import { NOTICE_UNTIL, isOtherGamePath, noticeFor, type NoticeState } from "@/lib/launch-notice";

const base: NoticeState = { pathname: "/", entry: "/", done: false, playedNewGame: false, today: "2026-11-18" };
const at = (over: Partial<NoticeState>) => noticeFor({ ...base, ...over });

describe("launch notice", () => {
  it("pops up on the home page", () => {
    expect(at({})).toBe("popup");
    expect(at({ entry: "/chainlink" })).toBe("popup");
  });

  it("shows the banner on another game for a visit that started there", () => {
    expect(at({ pathname: "/chainlink", entry: "/chainlink" })).toBe("banner");
    expect(at({ pathname: "/ball-knowledge/daily", entry: "/s/brain-dead" })).toBe("banner");
    expect(at({ pathname: "/draft-anything", entry: "/draft-anything" })).toBe("banner");
  });

  it("shows no banner to a visit that started on the home page", () => {
    expect(at({ pathname: "/chainlink", entry: "/" })).toBeNull();
  });

  it("never shows on Dead Reckoning itself, or on pages that are not games", () => {
    expect(at({ pathname: "/dead-reckoning", entry: "/dead-reckoning" })).toBeNull();
    expect(at({ pathname: "/privacy", entry: "/privacy" })).toBeNull();
    expect(at({ pathname: "/admin/daily-review", entry: "/admin/daily-review" })).toBeNull();
  });

  it("ends for good once seen through, or once the game is played", () => {
    expect(at({ done: true })).toBeNull();
    expect(at({ playedNewGame: true })).toBeNull();
    expect(at({ pathname: "/chainlink", entry: "/chainlink", done: true })).toBeNull();
  });

  it("stops after its last day", () => {
    expect(at({ today: NOTICE_UNTIL })).toBe("popup");
    expect(at({ today: "2026-12-02" })).toBeNull();
  });

  it("knows a game's pages by their folder", () => {
    expect(isOtherGamePath("/getting-warmer/daily")).toBe(true);
    expect(isOtherGamePath("/getting-warmer")).toBe(true);
    expect(isOtherGamePath("/hot-takes")).toBe(true);
    expect(isOtherGamePath("/chainlinkish")).toBe(false);
    expect(isOtherGamePath("/dead-reckoning")).toBe(false);
    expect(isOtherGamePath("/")).toBe(false);
  });
});
