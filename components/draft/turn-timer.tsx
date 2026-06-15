"use client";

import { useEffect, useState, useRef } from "react";

interface TurnTimerProps {
  deadline: string | null;
  timerSeconds: number | null;
  draftId: string;
  isMyTurn: boolean;
  myPlayerId: string;
}

export function TurnTimer({
  deadline,
  timerSeconds,
  draftId,
  isMyTurn,
  myPlayerId,
}: TurnTimerProps) {
  const [expired, setExpired] = useState(false);
  const [display, setDisplay] = useState<number | null>(null);
  const autoPickTriggeredRef = useRef(false);

  useEffect(() => {
    if (!deadline || !timerSeconds) {
      autoPickTriggeredRef.current = false;
      return;
    }

    let mounted = true;

    const tick = () => {
      if (!mounted) return;
      const deadlineMs = new Date(deadline).getTime();
      const nowMs = Date.now();
      const remaining = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));

      setDisplay(remaining);
      if (remaining <= 0) {
        setExpired(true);
      }
    };

    tick();
    const interval = setInterval(tick, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [deadline, timerSeconds]);

  useEffect(() => {
    if (!deadline || !timerSeconds) {
      autoPickTriggeredRef.current = false;
      return;
    }

    const deadlineMs = new Date(deadline).getTime();
    const nowMs = Date.now();
    if (nowMs >= deadlineMs && !autoPickTriggeredRef.current && isMyTurn) {
      autoPickTriggeredRef.current = true;
      void triggerAutoPick(draftId);
    }
  }, [deadline, timerSeconds, draftId, isMyTurn, myPlayerId]);

  if (!timerSeconds || display === null) {
    return null;
  }

  const minutes = Math.floor(display / 60);
  const seconds = display % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isLow = display <= 10;

  return (
    <span
      className={`font-mono font-bold text-sm ${
        expired
          ? "text-red-600"
          : isLow
            ? "text-orange-500"
            : "text-gray-700"
      }`}
      aria-label={`Turn timer: ${formatted} remaining`}
      aria-live="polite"
    >
      {formatted}
    </span>
  );
}

async function triggerAutoPick(draftId: string) {
  try {
    await fetch(`/api/drafts/${draftId}/auto-pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    // auto-pick errors are non-fatal (the RPC is idempotent)
  }
}
