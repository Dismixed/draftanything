"use client";

import { useEffect, useMemo } from "react";
import type { DraftRoomProjection } from "@/features/draft/types";
import { buildPublicResult } from "@/features/results/build-public-result";
import { ResultsBody } from "@/components/results/results-body";

interface CompletePanelProps {
  projection: DraftRoomProjection;
}

export function CompletePanel({ projection }: CompletePanelProps) {
  const { draft, judgment } = projection;
  const result = useMemo(() => buildPublicResult(projection), [projection]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(5, 7, 18, 0.88)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="panel-card"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "min(92vh, 900px)",
          overflow: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <header>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 6px 0",
            }}
          >
            Draft Complete
          </p>
          <h2
            id="complete-modal-title"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: "italic",
              fontSize: "24px",
              color: "var(--text)",
              margin: 0,
            }}
          >
            {result.topic}
          </h2>
        </header>

        {judgment ? (
          <ResultsBody
            result={result}
            draftId={draft.id}
            maxPlayers={draft.maxPlayers}
          />
        ) : (
          <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
            The draft is complete. Results are being processed.
          </p>
        )}
      </div>
    </div>
  );
}
