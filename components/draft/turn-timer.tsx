"use client";

import { useEffect, useState, useRef } from "react";

interface TurnTimerProps {
  deadline: string | null;
  timerSeconds: number | null;
  draftId: string;
  isMyTurn: boolean;
  myPlayerId: string;
  serverNow: string;
}

export function TurnTimer({
  deadline,
  timerSeconds,
  draftId,
  isMyTurn,
  myPlayerId,
  serverNow,
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

    const deadlineMs = new Date(deadline).getTime();
    const serverNowMs = new Date(serverNow).getTime();
    const clockOffset = Date.now() - serverNowMs;

    const tick = () => {
      if (!mounted) return;
      const nowMs = Date.now();
      const adjustedNow = nowMs - clockOffset;
      const remaining = Math.max(0, Math.floor((deadlineMs - adjustedNow) / 1000));

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
  }, [deadline, timerSeconds, serverNow]);

  useEffect(() => {
    if (!deadline || !timerSeconds) {
      autoPickTriggeredRef.current = false;
      return;
    }

    const deadlineMs = new Date(deadline).getTime();
    const serverNowMs = new Date(serverNow).getTime();
    const clockOffset = Date.now() - serverNowMs;
    const adjustedNow = Date.now() - clockOffset;
    if (adjustedNow >= deadlineMs && !autoPickTriggeredRef.current && isMyTurn) {
      autoPickTriggeredRef.current = true;
      void triggerAutoPick(draftId);
    }
  }, [deadline, timerSeconds, serverNow, draftId, isMyTurn, myPlayerId]);

  if (!timerSeconds || display === null) {
    return null;
  }

  const minutes = Math.floor(display / 60);
  const seconds = display % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isLow = display <= 10;

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: expired ? '14px' : '22px',
        color: expired ? '#ff4444' : isLow ? '#f0c860' : 'var(--cyan)',
        textShadow: expired ? 'none' : isLow ? '0 0 12px rgba(240,200,96,0.5)' : '0 0 16px rgba(0,229,255,0.5), 0 0 48px rgba(0,229,255,0.18)',
        letterSpacing: '0.04em',
      }}
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
