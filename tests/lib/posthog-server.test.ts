import { describe, expect, it } from "vitest";
import { withRequestIdentity } from "@/lib/posthog-server";

const request = (headers: Record<string, string> = {}) => new Request("https://stimgames.com/api/x", { headers });

describe("withRequestIdentity", () => {
  it("credits the event to the player whose browser sent it", () => {
    const message = withRequestIdentity(
      request({ "X-POSTHOG-DISTINCT-ID": "019a-player", "X-POSTHOG-SESSION-ID": "019a-session" }),
      { event: "chainlink_guess_submitted", properties: { correct: true } },
    );
    expect(message.distinctId).toBe("019a-player");
    expect(message.properties).toEqual({ $session_id: "019a-session", correct: true });
  });

  it("prefers the browser's id over the fallback", () => {
    const message = withRequestIdentity(request({ "x-posthog-distinct-id": "019a-player" }), { event: "draft_pick" }, "guest-1");
    expect(message.distinctId).toBe("019a-player");
  });

  it("uses the fallback when the browser sent no id", () => {
    expect(withRequestIdentity(request(), { event: "draft_pick" }, "guest-1").distinctId).toBe("guest-1");
  });

  it("leaves the event personless when there is no id at all", () => {
    const message = withRequestIdentity(request(), { event: "getting_warmer_guess_submitted", properties: { correct: true } });
    expect(message.distinctId).toBeUndefined();
    expect(message.properties).toEqual({ correct: true });
  });

  it("ignores a header that is not an id", () => {
    const message = withRequestIdentity(request({ "x-posthog-distinct-id": "PILOT is the answer" }), { event: "x" });
    expect(message.distinctId).toBeUndefined();
  });
});
