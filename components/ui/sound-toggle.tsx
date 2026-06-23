"use client";

import { useSound } from "@/lib/audio/sound-context";

export function SoundToggle({ className }: { className?: string }) {
  const { muted, toggleMute } = useSound();

  return (
    <button
      type="button"
      onClick={toggleMute}
      className={className}
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      aria-pressed={muted}
      style={{
        background: "transparent",
        border: "1px solid var(--border-hi)",
        color: muted ? "var(--text-dim)" : "var(--gold)",
        borderRadius: "8px",
        padding: "6px 10px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
      }}
    >
      {muted ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M11 5L6 9H3v6h3l5 4V5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M11 5L6 9H3v6h3l5 4V5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
