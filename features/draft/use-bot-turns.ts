"use client";

import { useEffect, useRef } from "react";

/** How long the host's browser lets an AI drafter "think" before asking for its pick. */
export const BOT_PICK_HOST_DELAY_MS = 1_500;
/** Everyone else waits longer, and only steps in if the host's browser has not. */
export const BOT_PICK_OTHER_DELAY_MS = 6_000;
/** While it is still the same AI turn, ask again this often. */
export const BOT_PICK_RETRY_MS = 4_000;

interface UseBotTurnsOptions {
  draftId: string;
  /** True while the seat on the clock belongs to an AI drafter. */
  active: boolean;
  /** The current pick index; the server ignores a request for any other turn. */
  pickIndex: number;
  isHost: boolean;
  /** Called after each answered request so the room can refetch. */
  onPicked: () => void;
}

/**
 * AI drafters have no browser of their own, so the people in the room ask the
 * server to make their picks. The server accepts one pick per turn, so several
 * browsers asking at once is harmless.
 *
 * The request repeats until the turn changes: a lost request, a server error
 * or a "stale" answer for a turn that has not actually moved all end the same
 * way, with another attempt a few seconds later.
 */
export function useBotTurns({
  draftId,
  active,
  pickIndex,
  isHost,
  onPicked,
}: UseBotTurnsOptions): void {
  const onPickedRef = useRef(onPicked);
  useEffect(() => {
    onPickedRef.current = onPicked;
  }, [onPicked]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const attempt = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/drafts/${draftId}/bot-pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedPick: pickIndex }),
        });
        if (res.ok && !cancelled) onPickedRef.current();
      } catch {
        // Retried below.
      }
      if (!cancelled) timer = setTimeout(attempt, BOT_PICK_RETRY_MS);
    };

    timer = setTimeout(attempt, isHost ? BOT_PICK_HOST_DELAY_MS : BOT_PICK_OTHER_DELAY_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [draftId, active, pickIndex, isHost]);
}
