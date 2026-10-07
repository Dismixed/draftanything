"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/track";
import type { DailyGameId } from "@/lib/games/registry";

function prefersShareSheet(): boolean {
  return (
    typeof navigator.share === "function" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function ShareResult({ gameId, text }: { gameId: DailyGameId; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (prefersShareSheet()) {
      try {
        await navigator.share({ text });
        track("result_shared", { game: gameId, method: "share" });
      } catch {
        // The person closed the share sheet. Nothing was shared.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track("result_shared", { game: gameId, method: "copy" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access was refused; leave the button as it was.
    }
  }

  return (
    <button type="button" className="share-result" onClick={handleClick} aria-label="Share result">
      {copied ? "Copied" : "Share result"}
    </button>
  );
}
