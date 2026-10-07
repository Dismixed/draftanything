import { describe, expect, it } from "vitest";
import { runJobs } from "./run-jobs";

describe("runJobs", () => {
  it("reports each job's result by name", async () => {
    const report = await runJobs({ a: async () => ({ scheduled: 2 }), b: async () => "done" });
    expect(report).toEqual({
      a: { ok: true, result: { scheduled: 2 } },
      b: { ok: true, result: "done" },
    });
  });

  it("keeps running the other jobs when one fails", async () => {
    const report = await runJobs({
      broken: async () => {
        throw new Error("no api key");
      },
      fine: async () => 1,
    });
    expect(report.broken).toEqual({ ok: false, error: "no api key" });
    expect(report.fine).toEqual({ ok: true, result: 1 });
  });
});
