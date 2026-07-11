import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (!token) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[PostHog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set — client events will not be captured.",
    );
  }
} else {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
