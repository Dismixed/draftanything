import { describe, expect, it } from "vitest";
import { hitCall, missCall, streakCall } from "@/lib/ball-knowledge/broadcast";

describe("Ball Knowledge broadcast calls", () => {
  it("stays quiet about a run until it reaches three", () => {
    expect(streakCall(0)).toBeNull();
    expect(streakCall(2)).toBeNull();
    expect(streakCall(3)).toBe("HEATING UP!");
    expect(streakCall(4)).toBe("HEATING UP!");
  });

  it("escalates as the run grows and never runs out", () => {
    expect(streakCall(5)).toBe("ON FIRE!");
    expect(streakCall(7)).toBe("UNCONSCIOUS!");
    expect(streakCall(10)).toBe("CAN'T MISS!");
    expect(streakCall(400)).toBe("CAN'T MISS!");
  });

  it("gives an ordinary call to an answer outside a run", () => {
    const call = hitCall("Ketchup", 1, 1);
    expect(call.kind).toBe("hit");
    expect(call.headline).toBe("BUCKET!");
    expect(call.detail).toBe("Ketchup");
  });

  it("varies the ordinary call with the score and wraps around", () => {
    expect(hitCall("Mustard", 2, 1).headline).toBe("COUNT IT!");
    expect(hitCall("Relish", 9, 1).headline).toBe("BUCKET!");
    expect(hitCall("Salsa", 0, 0).headline).toBe("BUCKET!");
  });

  it("promotes the call and names the run once it is on", () => {
    const call = hitCall("Ranch", 6, 5);
    expect(call.kind).toBe("big");
    expect(call.headline).toBe("ON FIRE!");
    expect(call.detail).toBe("Ranch · 5 in a row");
  });

  it("mentions a two-answer run without promoting it", () => {
    const call = hitCall("Mayo", 2, 2);
    expect(call.kind).toBe("hit");
    expect(call.detail).toBe("Mayo · 2 in a row");
  });

  it("calls a miss with the reason it was rejected", () => {
    const call = missCall("Lettuce", "not a condiment", 1);
    expect(call).toEqual({ kind: "miss", headline: "AIRBALL", detail: "Lettuce · not a condiment" });
  });

  it("rotates miss calls and copes with no reason", () => {
    expect(missCall("Ketchup", "", 2)).toEqual({ kind: "miss", headline: "OFF THE IRON", detail: "Ketchup" });
    expect(missCall("x", "", 5).headline).toBe("AIRBALL");
  });
});
