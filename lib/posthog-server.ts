import { PostHog } from "posthog-node";

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
