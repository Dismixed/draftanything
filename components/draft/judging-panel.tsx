"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection } from "@/features/draft/types";
import { buildPublicResult } from "@/features/results/build-public-result";
import { ResultsBody } from "@/components/results/results-body";
import { ButtonLoadingLabel, ButtonSpinner } from "@/components/ui/button-spinner";
import { RosterColumn } from "./player-rosters";

interface JudgingPanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function JudgingPanel({ projection, myPlayerId }: JudgingPanelProps) {
  const router = useRouter();
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const { draft, players, picks, availableItems, judgment } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const alreadyJudged = judgment !== null;
  const isEvaluating =
    !alreadyJudged && (judging || draft.judgingStartedAt != null);

  const result = useMemo(() => buildPublicResult(projection), [projection]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (judgment) {
      setShowResults(true);
    }
  }, [judgment]);

  const itemMap = useMemo(
    () => new Map(availableItems.map((item) => [item.id, item])),
    [availableItems],
  );

  const rosters = useMemo(() => {
    const map = new Map<string, typeof picks>();
    for (const player of players) {
      map.set(
        player.id,
        picks
          .filter((p) => p.playerId === player.id)
          .sort((a, b) => a.overallPick - b.overallPick),
      );
    }
    return map;
  }, [players, picks]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.seat - b.seat),
    [players],
  );

  const defenseByPlayer = useMemo(
    () => new Map(projection.defenses.map((d) => [d.playerId, d])),
    [projection.defenses],
  );

  const handleRunJudging = useCallback(async () => {
    setJudging(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Judging failed");
      }

      setShowResults(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setJudging(false);
    }
  }, [draft.id, router]);

  const handleAdvance = useCallback(async () => {
    setJudging(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to advance phase");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setJudging(false);
    }
  }, [draft.id, router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judging-modal-title"
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
            {showResults && alreadyJudged ? "Results" : "Judging Phase"}
          </p>
          <h2
            id="judging-modal-title"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: "italic",
              fontSize: "24px",
              color: "var(--text)",
              margin: "0 0 6px 0",
            }}
          >
            {showResults && alreadyJudged ? result.topic : alreadyJudged ? "Results Ready" : isEvaluating ? "Evaluating Rosters" : "Run Judging"}
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
            {showResults && alreadyJudged
              ? "Final rankings, awards, and the judge's explanation."
              : alreadyJudged
                ? "Judging is complete. View the full results below."
                : isEvaluating
                  ? isHost
                    ? "The judge is reviewing every roster. This can take a moment."
                    : "The host started judging. Hang tight while rosters are evaluated."
                  : "Review the final rosters, then run judging when everyone is ready."}
          </p>
        </header>

        {isEvaluating && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.35)",
              color: "var(--gold-hi)",
              fontSize: "13px",
            }}
          >
            <ButtonSpinner size={16} />
            <span>
              {isHost ? "Evaluating rosters..." : "Host is evaluating rosters..."}
            </span>
          </div>
        )}

        {showResults && alreadyJudged ? (
          <ResultsBody
            result={result}
            draftId={draft.id}
            showShare={false}
          />
        ) : (
          <section aria-label="Final rosters">
            <h3
              style={{
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                margin: "0 0 12px 0",
              }}
            >
              Final Rosters
            </h3>
            <div
              className="flex flex-col gap-2.5 sm:grid sm:gap-2.5"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {sortedPlayers.map((player) => {
                const defense = defenseByPlayer.get(player.id);
                return (
                  <div key={player.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <RosterColumn
                      player={player}
                      playerPicks={rosters.get(player.id) ?? []}
                      itemMap={itemMap}
                      isMe={player.id === myPlayerId}
                      isOnClock={false}
                    />
                    {defense && !defense.skipped && defense.defenseText && (
                      <p
                        style={{
                          fontSize: "10px",
                          color: "var(--text-dim)",
                          margin: 0,
                          paddingLeft: "4px",
                          fontStyle: "italic",
                          lineHeight: 1.4,
                        }}
                      >
                        &ldquo;{defense.defenseText.slice(0, 120)}
                        {defense.defenseText.length > 120 ? "…" : ""}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section
          aria-label="Judging actions"
          style={{
            borderTop: "1px solid var(--border-hi)",
            paddingTop: "16px",
          }}
        >
          {alreadyJudged ? (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowResults((v) => !v)}
                className="btn-gold"
                style={{ flex: "1 1 160px" }}
              >
                {showResults ? "— View Rosters —" : "— View Full Results —"}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={judging}
                  className="btn-ghost"
                  style={{ flex: "1 1 160px" }}
                >
                  <ButtonLoadingLabel
                    loading={judging}
                    label="Advance to Complete"
                    loadingLabel="Advancing..."
                  />
                </button>
              )}
            </div>
          ) : isHost ? (
            <div>
              <button
                type="button"
                onClick={handleRunJudging}
                disabled={isEvaluating}
                className="btn-gold"
                style={{ width: "100%" }}
              >
                <ButtonLoadingLabel
                  loading={isEvaluating}
                  label="— Run Judging —"
                  loadingLabel="Evaluating..."
                />
              </button>
            </div>
          ) : (
            <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
              {isEvaluating ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  <ButtonSpinner size={16} />
                  The host is evaluating rosters...
                </span>
              ) : (
                "Waiting for the host to run judging."
              )}
            </p>
          )}

          {error && (
            <p style={{ color: "#ff4d4d", fontSize: "12px", marginTop: "8px" }}>{error}</p>
          )}
        </section>
      </div>
    </div>
  );
}
