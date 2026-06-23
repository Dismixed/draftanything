"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftRoomProjection } from "@/features/draft/types";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface VetoPanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function VetoPanel({ projection, myPlayerId }: VetoPanelProps) {
  const [submitting, setSubmitting] = useState<"veto" | "keep" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { draft, players, picks, vetoVotes } = projection;
  const pendingPick = picks.find((p) => p.id === draft.pendingPickId);
  const picker = pendingPick
    ? players.find((p) => p.id === pendingPick.playerId)
    : undefined;

  const eligibleVoters = useMemo(
    () =>
      players.filter(
        (p) => p.id !== pendingPick?.playerId,
      ),
    [players, pendingPick?.playerId],
  );

  const votesNeeded = Math.floor(eligibleVoters.length / 2) + 1;

  const activeVetoVotes = useMemo(
    () =>
      vetoVotes.filter(
        (v) => v.pickId === draft.pendingPickId,
      ),
    [vetoVotes, draft.pendingPickId],
  );

  const vetoCount = activeVetoVotes.filter((v) => v.wantsVeto).length;
  const votesCast = activeVetoVotes.length;
  const isPicker = pendingPick?.playerId === myPlayerId;
  const myVote = activeVetoVotes.find((v) => v.voterPlayerId === myPlayerId);
  const canVote = !isPicker && eligibleVoters.some((p) => p.id === myPlayerId);

  useEffect(() => {
    setError(null);
  }, [draft.pendingPickId]);

  const submitVote = async (wantsVeto: boolean) => {
    setSubmitting(wantsVeto ? "veto" : "keep");
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/veto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wantsVeto }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to submit vote");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit vote");
    } finally {
      setSubmitting(null);
    }
  };

  if (!pendingPick || pendingPick.forfeited) {
    return null;
  }

  return (
    <div
      className="anim-fade-slide-up"
      style={{
        padding: "16px 20px",
        borderBottom: "1px solid var(--border-hi)",
        background: "rgba(201,168,76,0.06)",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <p
          style={{
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--gold)",
            margin: "0 0 8px 0",
            textAlign: "center",
          }}
        >
          Veto vote
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: "15px",
            color: "var(--text)",
            margin: "0 0 4px 0",
          }}
        >
          <span style={{ color: "var(--text-dim)" }}>{picker?.displayName ?? "Player"}</span>
          {" picked "}
          <strong style={{ color: "var(--gold-hi)" }}>
            {pendingPick.itemName ?? "?"}
          </strong>
        </p>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--text-dim)",
            margin: "0 0 16px 0",
          }}
        >
          {vetoCount} of {votesNeeded} veto{votesNeeded === 1 ? "" : "s"} needed
          {" · "}
          {votesCast} of {eligibleVoters.length} voted
        </p>

        {error && (
          <p
            role="alert"
            style={{
              color: "#ff4d4d",
              fontSize: "12px",
              textAlign: "center",
              margin: "0 0 12px 0",
            }}
          >
            {error}
          </p>
        )}

        {isPicker ? (
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--text-dim)",
              margin: 0,
            }}
          >
            Waiting for other players to vote on your pick...
          </p>
        ) : canVote ? (
          myVote ? (
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "var(--text-dim)",
                margin: 0,
              }}
            >
              You voted to {myVote.wantsVeto ? "veto" : "let it stand"}.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => void submitVote(true)}
                style={{
                  background: "rgba(255,68,68,0.12)",
                  color: "#ff6b6b",
                  border: "1px solid rgba(255,68,68,0.45)",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting === "keep" ? 0.6 : 1,
                  minWidth: "140px",
                }}
              >
                {submitting === "veto" ? (
                  <ButtonLoadingLabel loading loadingLabel="Vetoing" label="Veto pick" />
                ) : (
                  "Veto pick"
                )}
              </button>
              <button
                type="button"
                disabled={submitting !== null}
                onClick={() => void submitVote(false)}
                style={{
                  background: "var(--panel)",
                  color: "var(--text)",
                  border: "1px solid var(--border-hi)",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting === "veto" ? 0.6 : 1,
                  minWidth: "140px",
                }}
              >
                {submitting === "keep" ? (
                  <ButtonLoadingLabel loading loadingLabel="Saving" label="Let it stand" />
                ) : (
                  "Let it stand"
                )}
              </button>
            </div>
          )
        ) : (
          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--text-dim)",
              margin: 0,
            }}
          >
            Waiting for votes...
          </p>
        )}
      </div>
    </div>
  );
}
