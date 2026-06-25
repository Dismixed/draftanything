"use client";

import { useEffect, useState } from "react";
import type { ClientClue } from "@/lib/anyguessr/types";
import ClueCard from "./clue-card";
import ProgressDots from "./progress-dots";

interface Props {
  clues: ClientClue[];
  revealedCount: number;
  totalClues: number;
  puzzleId: string | null;
  onNavigate?: () => void;
}

export default function ClueViewer({
  clues,
  revealedCount,
  totalClues,
  puzzleId,
  onNavigate,
}: Props) {
  const [viewingIndex, setViewingIndex] = useState(0);

  useEffect(() => {
    setViewingIndex(Math.max(0, revealedCount - 1));
  }, [puzzleId]);

  useEffect(() => {
    setViewingIndex(revealedCount - 1);
  }, [revealedCount]);

  if (revealedCount === 0) return null;

  const clue = clues[viewingIndex];
  if (!clue) return null;

  const canGoBack = viewingIndex > 0;
  const canGoForward = viewingIndex < revealedCount - 1;

  const goTo = (index: number) => {
    setViewingIndex(index);
    onNavigate?.();
  };

  return (
    <>
      <ClueCard clue={clue} index={viewingIndex} revealed />

      {revealedCount > 1 && (
        <nav
          aria-label="Clue navigation"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            marginTop: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => goTo(viewingIndex - 1)}
            disabled={!canGoBack}
            style={navBtnStyle(!canGoBack)}
            aria-label="Previous clue"
          >
            ← Previous
          </button>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ag-muted)",
              whiteSpace: "nowrap",
            }}
          >
            Clue {viewingIndex + 1} of {revealedCount}
          </span>
          <button
            type="button"
            onClick={() => goTo(viewingIndex + 1)}
            disabled={!canGoForward}
            style={navBtnStyle(!canGoForward)}
            aria-label="Next clue"
          >
            Next →
          </button>
        </nav>
      )}

      {totalClues > 0 && (
        <div style={{ marginTop: "20px" }}>
          <ProgressDots
            current={revealedCount}
            total={totalClues}
            active={viewingIndex}
          />
        </div>
      )}
    </>
  );
}

function navBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.04em",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    background: "var(--ag-surface-hi)",
    color: "var(--ag-text)",
    border: "1px solid var(--ag-border)",
    flexShrink: 0,
  };
}
