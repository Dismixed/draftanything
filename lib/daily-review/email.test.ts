import { describe, expect, it, vi } from "vitest";
import type { ReviewContext } from "./service";
import type { ReviewSummary } from "./types";

vi.mock("./service", () => ({
  getReviewGrid: vi.fn(async () => ({ today: "2026-10-15", dates: ["2026-10-15", "2026-10-24"], columns: [] })),
  summarize: vi.fn(
    (): ReviewSummary => ({
      total: 4,
      byGame: [{ game: "hot-takes", name: "Hot Takes", count: 4, first: "2026-10-17" }],
    }),
  ),
}));

import { summarize } from "./service";
import { buildReviewEmail, isEmailDue, sendReviewEmailIfDue } from "./email";

const NOW = new Date("2026-10-15T06:00:00Z");

function ctxWith(lastSentAt: string | null) {
  const recordEmail = vi.fn(async () => {});
  const ctx = {
    db: {},
    adapters: [],
    store: { lastEmailSentAt: async () => lastSentAt, recordEmail },
  } as unknown as ReviewContext;
  return { ctx, recordEmail };
}

describe("isEmailDue", () => {
  it("is due when never sent", () => expect(isEmailDue(null, NOW, 7)).toBe(true));
  it("is not due after 6 days", () => expect(isEmailDue("2026-10-09T06:00:00Z", NOW, 7)).toBe(false));
  it("is due after 7 days", () => expect(isEmailDue("2026-10-08T06:00:00Z", NOW, 7)).toBe(true));
});

describe("buildReviewEmail", () => {
  it("names the count, the range, and links to the review page", () => {
    const email = buildReviewEmail(
      { total: 4, byGame: [{ game: "hot-takes", name: "Hot Takes", count: 4, first: "2026-10-17" }] },
      ["2026-10-15", "2026-10-24"],
      "https://stim.example",
    );
    expect(email.subject).toBe("4 dailies need review (Oct 15–Oct 24)");
    expect(email.html).toContain("https://stim.example/admin/review");
    expect(email.text).toContain("Hot Takes — 4 unreviewed, first: Sat Oct 17");
  });
});

describe("sendReviewEmailIfDue", () => {
  it("skips when SMTP is not configured", async () => {
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => false });
    expect(result).toMatchObject({ sent: false, reason: "SMTP not configured" });
    expect(send).not.toHaveBeenCalled();
    expect(recordEmail).not.toHaveBeenCalled();
  });

  it("skips when not due yet", async () => {
    const { ctx } = ctxWith("2026-10-12T06:00:00Z");
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result.reason).toBe("not due");
    expect(send).not.toHaveBeenCalled();
  });

  it("skips when everything is reviewed", async () => {
    vi.mocked(summarize).mockReturnValueOnce({ total: 0, byGame: [] });
    const { ctx } = ctxWith(null);
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result.reason).toBe("nothing to review");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends and records when due", async () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com, b@x.com");
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn(async () => {});
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result).toMatchObject({ sent: true, unreviewed: 4 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["a@x.com", "b@x.com"] }));
    expect(recordEmail).toHaveBeenCalledWith(4);
    vi.unstubAllEnvs();
  });

  it("does not record a send that threw", async () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com");
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn(async () => {
      throw new Error("535 bad credentials");
    });
    await expect(sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true })).rejects.toThrow("535");
    expect(recordEmail).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
