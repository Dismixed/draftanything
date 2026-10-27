"use client";

import posthog from "posthog-js";
import { useEffect, useState } from "react";

/**
 * This player's variant of a multivariate PostHog flag, or undefined while flags load, when the
 * flag is off, or when PostHog is blocked. Treat anything but the variant you test as the current
 * behaviour. Reading the flag records the player as exposed, so pass `enabled: false` until they
 * reach the part of the page the flag changes.
 */
export function useFeatureFlagVariant(key: string, { enabled = true }: { enabled?: boolean } = {}): string | undefined {
  const [variant, setVariant] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    try {
      return posthog.onFeatureFlags(() => {
        const value = posthog.getFeatureFlag(key);
        setVariant(typeof value === "string" ? value : undefined);
      });
    } catch {
      // PostHog can be blocked or uninitialised; the page keeps its current behaviour.
    }
  }, [key, enabled]);

  return variant;
}
