"use client";

import { useEffect, useRef, useState } from "react";
import type { ClientClue } from "@/lib/anyguessr/types";

const CLUE_TYPE_LABEL: Record<string, string> = {
  environment: "Environment",
  person: "Person / Identity",
  food: "Food",
  written_language: "Written Language",
  landmark: "Landmark",
  flag: "Flag",
  currency: "Currency",
  jersey: "Jersey",
  brand: "Brand",
  audio: "Spoken Language",
};

function labelFor(clue: ClientClue): string {
  return CLUE_TYPE_LABEL[clue.type] ?? capitalize(clue.type);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ClueCard({
  clue,
  index,
  revealed,
  headerLabel,
}: {
  clue: ClientClue;
  index: number;
  revealed: boolean;
  headerLabel?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Preload the *next* clue's image silently so the reveal flips open instantly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = clue.metadata?.image_url ?? clue.metadata?.thumb_url;
    if (url) {
      const img = new Image();
      img.src = url;
    }
  }, [clue]);

  if (!revealed) {
    return (
      <div
        ref={boxRef}
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          background: "var(--ag-surface)",
          border: "1px solid var(--ag-border)",
          borderRadius: "14px",
          color: "var(--ag-muted)",
        }}
        aria-label={`Clue ${index + 1} — locked`}
      >
        <div style={{ fontSize: "32px", opacity: 0.4 }}>🔒</div>
        <div style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase" }}>
          Locked
        </div>
      </div>
    );
  }

  const imageUrl = clue.metadata?.image_url ?? clue.metadata?.thumb_url;
  const audioUrl = clue.metadata?.audio_url;

  return (
    <div
      ref={boxRef}
      style={{
        width: "100%",
        background: "var(--ag-surface)",
        border: "1px solid var(--ag-border)",
        borderRadius: "14px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      aria-label={`Clue ${index + 1}: ${labelFor(clue)}`}
    >
      <div
        style={{
          padding: "10px 14px",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ag-accent)",
          borderBottom: "1px solid var(--ag-border)",
        }}
      >
        {headerLabel ?? `Clue ${index + 1} · ${labelFor(clue)}`}
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0e1c",
          position: "relative",
        }}
      >
        {!loaded && imageUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ag-muted)",
              fontSize: "12px",
            }}
          >
            Loading…
          </div>
        )}

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={clue.metadata?.alt_text ?? `${clue.type} clue`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.35s ease",
              display: "block",
            }}
          />
        )}

        {audioUrl && (
          <audio
            controls
            src={audioUrl}
            aria-label={`${clue.type} audio clue`}
            style={{ width: "92%", maxWidth: "320px" }}
          />
        )}

        {!imageUrl && !audioUrl && (
          <div
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "clamp(28px, 7vw, 48px)",
              fontWeight: 700,
              color: "var(--ag-text)",
              letterSpacing: "0.02em",
              padding: "24px",
              textAlign: "center",
            }}
          >
            {clue.content || "·"}
          </div>
        )}
      </div>
    </div>
  );
}