import { PostHog, type EventMessage } from "posthog-node";

/** Set by posthog-js on the site's own requests (`tracing_headers` in instrumentation-client.ts). */
const DISTINCT_ID_HEADER = "x-posthog-distinct-id";
const SESSION_ID_HEADER = "x-posthog-session-id";

function headerId(request: Request, name: string): string | undefined {
  const value = request.headers.get(name)?.trim();
  // An id, not free text: anything else is ignored rather than becoming a person.
  return value && value.length <= 200 && /^[\w.@:+-]+$/.test(value) ? value : undefined;
}

/**
 * A server event credited to the player whose browser made the request, so it joins their
 * other events. Without that header it goes to `fallbackDistinctId` when the route has a
 * real one (a draft guest), and otherwise to no one: posthog-node then records it without
 * creating a person. Never pass a puzzle id, round name or answer as the fallback; each
 * would show up as a user, and an answer would be readable in the people list.
 */
export function withRequestIdentity(
  request: Request,
  message: Omit<EventMessage, "distinctId">,
  fallbackDistinctId?: string,
): EventMessage {
  const sessionId = headerId(request, SESSION_ID_HEADER);
  return {
    ...message,
    distinctId: headerId(request, DISTINCT_ID_HEADER) ?? fallbackDistinctId,
    properties: { ...(sessionId ? { $session_id: sessionId } : {}), ...message.properties },
  };
}

let posthogClient: PostHog | null = null;
let warnedMissingToken = false;

function warnMissingToken() {
  if (warnedMissingToken || process.env.NODE_ENV !== "development") return;
  warnedMissingToken = true;
  console.warn(
    "[PostHog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set — server events will not be captured.",
  );
}

const noopPostHog = {
  capture: () => {},
  identify: () => {},
  flush: async () => {},
} as unknown as PostHog;

export function getPostHogClient(): PostHog {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) {
    warnMissingToken();
    return noopPostHog;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}
