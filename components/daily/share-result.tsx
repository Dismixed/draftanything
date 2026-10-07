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

type Status = "idle" | "copied" | "manual";

export function ShareResult({ gameId, text }: { gameId: DailyGameId; text: string }) {
  const [status, setStatus] = useState<Status>("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      track("result_shared", { game: gameId, method: "copy" });
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // No clipboard (insecure page, older or in-app browser): show the text to copy by hand.
      setStatus("manual");
    }
  }

  async function handleClick() {
    if (!prefersShareSheet()) {
      await copy();
      return;
    }

    try {
      await navigator.share({ text });
      track("result_shared", { game: gameId, method: "share" });
    } catch (error) {
      // AbortError means the person closed the share sheet. Anything else means sharing is
      // not available here, so copy instead.
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  }

  return (
    <div className="share-result-wrap">
      <button type="button" className="share-result" onClick={handleClick} aria-live="polite">
        {status === "copied" ? "Copied" : "Share result"}
      </button>
      {status === "manual" ? (
        <label className="share-result-manual">
          Couldn&apos;t copy automatically. Select and copy this:
          <textarea readOnly rows={4} value={text} onFocus={(event) => event.currentTarget.select()} />
        </label>
      ) : null}
    </div>
  );
}
