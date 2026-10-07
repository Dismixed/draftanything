import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/anyguessr/async-pool", async (original) => ({
  ...(await original<typeof import("@/lib/anyguessr/async-pool")>()),
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from "@/lib/anyguessr/async-pool";
import { resolveImageCandidates } from "@/lib/anyguessr/image-sourcing";

const mockFetch = fetchWithRetry as unknown as ReturnType<typeof vi.fn>;
const requestedUrls = () => mockFetch.mock.calls.map((call) => String(call[0]));

beforeEach(() => {
  // Every endpoint answers "nothing found"; these tests only watch what is asked.
  mockFetch.mockReset().mockResolvedValue({ ok: false, json: async () => ({}) });
});

describe("resolveImageCandidates", () => {
  const options = { clueType: "brand", country: "Austria", wikiTitle: "Red Bull" };

  it("pads results with a loose Commons search by default", async () => {
    await resolveImageCandidates(options);
    expect(requestedUrls().some((url) => url.includes("generator=search"))).toBe(true);
  });

  it("skips the Commons search when asked for the article's own images only", async () => {
    await resolveImageCandidates({ ...options, articleImagesOnly: true });
    expect(requestedUrls().some((url) => url.includes("generator=search"))).toBe(false);
    expect(requestedUrls().some((url) => url.includes("Red_Bull"))).toBe(true);
  });
});
