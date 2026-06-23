import { describe, expect, it } from "vitest";
import { getResultImageUrl } from "./image-url";

describe("getResultImageUrl", () => {
  it("includes completedAt as cache-busting v param", () => {
    const url = getResultImageUrl("draft-123", "2026-06-23T12:00:00.000Z");
    expect(url).toBe(
      "/api/results/draft-123/image?v=2026-06-23T12%3A00%3A00.000Z",
    );
  });

  it("adds download=1 when requested", () => {
    const url = getResultImageUrl("draft-123", "2026-06-23T12:00:00.000Z", {
      download: true,
    });
    expect(url).toContain("download=1");
    expect(url).toContain("v=2026-06-23T12%3A00%3A00.000Z");
  });
});
