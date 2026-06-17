"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection } from "@/features/draft/types";
import { RosterColumn } from "./player-rosters";

interface DefensePanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function DefensePanel({ projection, myPlayerId }: DefensePanelProps) {
  const router = useRouter();
  const myDefense = projection.defenses.find((d) => d.playerId === myPlayerId);
  const [defenseText, setDefenseText] = useState(myDefense?.defenseText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(myDefense != null);
  const [skippedDefense, setSkippedDefense] = useState(myDefense?.skipped ?? false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const existing = projection.defenses.find((d) => d.playerId === myPlayerId);
    if (existing) {
      setSubmitted(true);
      setSkippedDefense(existing.skipped);
      if (existing.defenseText) {
        setDefenseText(existing.defenseText);
      }
    }
  }, [projection.defenses, myPlayerId]);

  const { draft, players, picks, availableItems } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

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

  const allDefensesIn = projection.defenses.length >= players.length;

  const handleSubmit = async (skipped: boolean) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/defense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defenseText: skipped ? null : defenseText,
          skipped,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to submit defense");
      }

      setSubmitted(true);
      setSkippedDefense(skipped);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="defense-modal-title"
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
            Defense Phase
          </p>
          <h2
            id="defense-modal-title"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: "italic",
              fontSize: "24px",
              color: "var(--text)",
              margin: "0 0 6px 0",
            }}
          >
            Defend Your Picks
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
            Review every roster, then make your case for why yours deserves to win.
          </p>
        </header>

        <section aria-label="All rosters">
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
                  {defense && (
                    <p style={{ fontSize: "10px", color: "var(--cyan)", margin: 0, paddingLeft: "4px" }}>
                      {defense.skipped ? "Skipped defense" : "Defense submitted"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section
          aria-label="Your defense"
          style={{
            borderTop: "1px solid var(--border-hi)",
            paddingTop: "16px",
          }}
        >
          {submitted ? (
            <div>
              <p style={{ color: "var(--cyan)", fontSize: "13px", margin: "0 0 12px 0" }}>
                {skippedDefense ? "You skipped your defense." : "Defense submitted successfully."}
              </p>
              {!allDefensesIn && (
                <p style={{ color: "var(--text-dim)", fontSize: "12px", margin: "0 0 12px 0" }}>
                  Waiting for other players to defend or skip...
                </p>
              )}
              {isHost && !allDefensesIn && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={submitting}
                  autoFocus
                  className="btn-ghost"
                >
                  {submitting ? "Advancing..." : "End Defense Early"}
                </button>
              )}
            </div>
          ) : (
            <div>
              <h3
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  margin: "0 0 10px 0",
                }}
              >
                Your Argument
              </h3>
              <textarea
                value={defenseText}
                onChange={(e) => setDefenseText(e.target.value)}
                placeholder="My roster is strategically superior because..."
                className="da-textarea"
                rows={4}
                maxLength={2000}
                disabled={submitting}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || defenseText.trim().length === 0}
                  className="btn-gold"
                  style={{ flex: "1 1 160px" }}
                >
                  {submitting ? "Submitting..." : "— Submit Defense —"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="btn-ghost"
                  style={{ flex: "1 1 120px" }}
                >
                  Skip Defense
                </button>
              </div>
              {isHost && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={submitting}
                  className="btn-ghost"
                  style={{ marginTop: "12px" }}
                >
                  {submitting ? "Advancing..." : "End Defense Early"}
                </button>
              )}
            </div>
          )}

          {error && (
            <p style={{ color: "#ff4d4d", fontSize: "12px", marginTop: "8px" }}>{error}</p>
          )}
        </section>
      </div>
    </div>
  );
}
