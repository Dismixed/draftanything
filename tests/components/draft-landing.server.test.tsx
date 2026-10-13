// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DraftLanding } from "@/components/draft-landing/landing";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

describe("DraftLanding on the server", () => {
  it("renders the heading as a full sentence without JavaScript", () => {
    const html = renderToString(<DraftLanding />);
    expect(html).toContain("Tonight we are drafting");
    expect(html).toContain("comfort foods.");
  });
});
