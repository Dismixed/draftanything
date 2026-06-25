"use client";

import type { PublicDraftResult } from "@/features/results/build-public-result";
import { WinnerReveal } from "./winner-reveal";
import { Rankings } from "./rankings";
import { Awards } from "./awards";
import { TopUndraftedPick } from "./top-undrafted-pick";
import { ShareActions } from "./share-actions";
import { ResultsConfetti } from "./results-confetti";
interface ResultsBodyProps {
  result: PublicDraftResult;
  draftId: string;
  showShare?: boolean;
}

export function ResultsBody({
  result,
  draftId,
  showShare = true,
}: ResultsBodyProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {result.winner && (
        <>
          <ResultsConfetti />
          <WinnerReveal winner={result.winner} topic={result.topic} />
        </>
      )}

      <Rankings ranking={result.ranking} />

      {result.awards.length > 0 && <Awards awards={result.awards} />}

      {result.topUndraftedPick && (
        <TopUndraftedPick itemName={result.topUndraftedPick} />
      )}

      {result.explanation && (
        <div className="panel-card" style={{ padding: "16px" }}>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              marginBottom: "10px",
            }}
          >
            Judge&apos;s Explanation
          </p>
          <p
            style={{
              color: "var(--text-dim)",
              fontSize: "13px",
              lineHeight: 1.65,
              whiteSpace: "pre-line",
              margin: 0,
            }}
          >
            {result.explanation}
          </p>
        </div>
      )}

      {showShare && (
        <ShareActions
          draftId={draftId}
          topic={result.topic}
          completedAt={result.completedAt}
        />
      )}
    </div>
  );
}
