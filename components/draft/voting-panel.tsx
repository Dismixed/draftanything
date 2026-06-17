"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection, SafePick } from "@/features/draft/types";
import { getPickItemLabel } from "@/features/draft/pick-label";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface VotingPanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

interface VoteState {
  selectedPlayerId: string | null;
  submitted: boolean;
}

export function VotingPanel({ projection, myPlayerId }: VotingPanelProps) {
  const router = useRouter();
  const [vote, setVote] = useState<VoteState>({ selectedPlayerId: null, submitted: false });
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<"vote" | "advance" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myVote = projection.votes.find((v) => v.voterPlayerId === myPlayerId);

  useEffect(() => {
    if (myVote) {
      setVote({
        selectedPlayerId: myVote.selectedPlayerId,
        submitted: true,
      });
    }
  }, [myVote]);

  const { draft, players, picks, availableItems } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  const itemMap = useMemo(
    () => new Map(availableItems.map((item) => [item.id, item])),
    [availableItems],
  );

  const rosters = useMemo(() => {
    const map = new Map<string, SafePick[]>();
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

  const handleVote = async () => {
    if (!vote.selectedPlayerId) return;

    setSubmitting(true);
    setPendingAction("vote");
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlayerId: vote.selectedPlayerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to submit vote");
      }

      setVote((prev) => ({ ...prev, submitted: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
      setPendingAction(null);
    }
  };

  const handleAdvance = async () => {
    setSubmitting(true);
    setPendingAction("advance");
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
      setPendingAction(null);
    }
  };

  const currentVoter = players.find((p) => p.id === myPlayerId);

  if (vote.submitted) {
    return (
      <section aria-label="Voting" className="panel-card" style={{ padding: '16px' }}>
        <h2
          style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: '0 0 12px 0',
          }}
        >
          Vote Recorded
        </h2>
        <p style={{ color: 'var(--cyan)', fontSize: '13px' }}>
          Your vote has been recorded.
        </p>
        {isHost && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={submitting}
            autoFocus
            className="btn-ghost"
            style={{ marginTop: '12px' }}
          >
            <ButtonLoadingLabel
              loading={submitting && pendingAction === "advance"}
              label="Close Voting Early"
              loadingLabel="Advancing..."
            />
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Voting" className="panel-card" style={{ padding: '16px' }}>
      <h2
        style={{
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          margin: '0 0 12px 0',
        }}
      >
        Vote for the Best Roster
      </h2>

      {currentVoter && (
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
          Voting as <span style={{ color: 'var(--text)' }}>{currentVoter.displayName}</span>
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {players.map((player) => {
          if (player.id === myPlayerId) return null;

          const playerPicks = rosters.get(player.id) ?? [];
          const isSelected = vote.selectedPlayerId === player.id;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => setVote((prev) => ({ ...prev, selectedPlayerId: player.id }))}
              disabled={submitting}
              style={{
                width: '100%',
                textAlign: 'left',
                background: isSelected ? 'rgba(201,168,76,0.04)' : 'var(--panel)',
                border: isSelected
                  ? '1px solid rgba(201,168,76,0.5)'
                  : '1px solid var(--border-hi)',
                boxShadow: isSelected ? '0 0 20px rgba(201,168,76,0.08) inset' : 'none',
                padding: '12px',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(124,58,255,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border-hi)';
                }
              }}
              aria-pressed={isSelected}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontStyle: 'italic',
                    fontSize: '15px',
                    color: 'var(--text)',
                  }}
                >
                  {player.displayName}
                </span>
                <span
                  style={{
                    border: '1px solid var(--border-hi)',
                    color: 'var(--text-dim)',
                    fontSize: '9px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                  }}
                >
                  Seat {player.seat}
                </span>
                {player.isHost && (
                  <span
                    style={{
                      border: '1px solid var(--border-hi)',
                      color: 'var(--text-dim)',
                      fontSize: '9px',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                    }}
                  >
                    Host
                  </span>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {playerPicks.length === 0 ? (
                  <li style={{ fontSize: '11px', color: 'var(--text-dim)' }}>No picks yet</li>
                ) : (
                  playerPicks.map((pick) => (
                      <li
                        key={pick.id}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: 'var(--border-hi)' }}>#{pick.overallPick}</span>
                        <span>{getPickItemLabel(pick, itemMap)}</span>
                      </li>
                    ))
                )}
              </ul>
            </button>
          );
        })}
      </div>

      {players.filter((p) => p.id !== myPlayerId).length === 0 && (
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
          No other players to vote for.
        </p>
      )}

      <button
        type="button"
        onClick={handleVote}
        disabled={submitting || !vote.selectedPlayerId}
        className="btn-gold"
        style={{ marginTop: '16px' }}
      >
        <ButtonLoadingLabel
          loading={submitting && pendingAction === "vote"}
          label="— Submit Vote —"
          loadingLabel="Submitting Vote..."
        />
      </button>

      {isHost && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={submitting}
          className="btn-ghost"
          style={{ marginTop: '8px' }}
        >
          <ButtonLoadingLabel
            loading={submitting && pendingAction === "advance"}
            label="Close Voting Early"
            loadingLabel="Advancing..."
          />
        </button>
      )}

      {error && (
        <p style={{ color: '#ff4d4d', fontSize: '12px', marginTop: '8px' }}>{error}</p>
      )}
    </section>
  );
}
