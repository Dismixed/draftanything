import posthog from "posthog-js";

type EventProps = Record<string, string | number | boolean>;

/** Sends a product event. Analytics must never break a click, so failures are swallowed. */
export function track(event: string, props: EventProps = {}): void {
  try {
    posthog.capture(event, props);
  } catch {
    // PostHog can be blocked or uninitialised; the action the user took still has to work.
  }
}
