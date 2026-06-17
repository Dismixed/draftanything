"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection } from "@/features/draft/types";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";
import { RosterColumn } from "./player-rosters";

interface DraftCompletePanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function DraftCompletePanel({ projection, myPlayerId }: DraftCompletePanelProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, players, picks, availableItems } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  const handleStartDefense = async () => {
    setStarting(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/start-defense`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to start defense");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-complete-modal-title"
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
            id="draft-complete-modal-title"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: "italic",
              fontSize: "24px",
              color: "var(--text)",
              margin: "0 0 6px 0",
            }}
          >
            {draft.topic}
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
            Every pick is in. Review the final rosters before defense begins.
          </p>
        </header>

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
            {sortedPlayers.map((player) => (
              <RosterColumn
                key={player.id}
                player={player}
                playerPicks={rosters.get(player.id) ?? []}
                itemMap={itemMap}
                isMe={player.id === myPlayerId}
                isOnClock={false}
              />
            ))}
          </div>
        </section>

        <section
          style={{
            borderTop: "1px solid var(--border-hi)",
            paddingTop: "16px",
          }}
        >
          {isHost ? (
            <button
              type="button"
              onClick={handleStartDefense}
              disabled={starting}
              autoFocus
              className="btn-gold"
              style={{ width: "100%" }}
            >
              <ButtonLoadingLabel
                loading={starting}
                label="— Begin Defense —"
                loadingLabel="Starting..."
              />
            </button>
          ) : (
            <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0, textAlign: "center" }}>
              Waiting for the host to begin defense...
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
