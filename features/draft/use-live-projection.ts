"use client";

import { useDraftStore } from "./store";
import type { DraftRoomProjection } from "./types";

/** Prefer realtime Zustand projection; fall back to SSR initial until subscribed. */
export function useLiveProjection(
  initial: DraftRoomProjection,
): DraftRoomProjection {
  const live = useDraftStore((s) => s.projection);
  return live ?? initial;
}
