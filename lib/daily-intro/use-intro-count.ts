"use client";

import { useEffect, useState } from "react";
import type { DailyGameId } from "@/lib/games/registry";

/** Today's player count, or null while loading, below the floor, unrecorded, or on any failure. */
export function useIntroCount(game: DailyGameId): number | null {
  const [count, setCount] = useState<{ game: DailyGameId; value: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/daily-intro/count?game=${game}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { count?: unknown } | null) => {
        if (cancelled || typeof body?.count !== "number") return;
        setCount({ game, value: body.count });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [game]);

  return count?.game === game ? count.value : null;
}
