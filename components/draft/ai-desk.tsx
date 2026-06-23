"use client";

import { useEffect, useState } from "react";
import type { SafeCommentary, SafePick, SafePlayer } from "@/features/draft/types";

interface AiDeskProps {
  draftId: string;
  commentary: SafeCommentary[];
  picks: SafePick[];
  players: SafePlayer[];
}

const TAG_STYLES: Record<string, React.CSSProperties> = {
  reach: {
    background: 'rgba(240,100,0,0.1)',
    color: '#f06000',
    border: '1px solid rgba(240,100,0,0.3)',
  },
  steal: {
    background: 'rgba(0,200,100,0.08)',
    color: '#00c864',
    border: '1px solid rgba(0,200,100,0.25)',
  },
  surprise: {
    background: 'rgba(255,200,0,0.1)',
    color: '#d4a000',
    border: '1px solid rgba(255,200,0,0.3)',
  },
  run: {
    background: 'rgba(0,180,255,0.08)',
    color: '#00b4ff',
    border: '1px solid rgba(0,180,255,0.25)',
  },
  trend: {
    background: 'rgba(124,58,255,0.1)',
    color: 'var(--purple)',
    border: '1px solid rgba(124,58,255,0.3)',
  },
  solid: {
    background: 'rgba(100,180,255,0.08)',
    color: '#5a9fd4',
    border: '1px solid rgba(100,180,255,0.25)',
  },
  roundup: {
    background: 'rgba(160,160,160,0.1)',
    color: 'var(--muted)',
    border: '1px solid rgba(160,160,160,0.25)',
  },
  opening: {
    background: 'rgba(255,80,120,0.08)',
    color: '#e04070',
    border: '1px solid rgba(255,80,120,0.25)',
  },
};

const TAG_LABELS: Record<string, string> = {
  reach: "Reach",
  steal: "Steal",
  surprise: "Surprise",
  run: "Run",
  trend: "Trend",
  solid: "Solid",
  roundup: "Roundup",
  opening: "Opening",
};

const tagPillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.08em',
};

function pickContextLabel(ctx: {
  pickNumber: number;
  playerName: string;
  itemName: string;
}) {
  return `Pick #${ctx.pickNumber} · ${ctx.playerName} — ${ctx.itemName}`;
}

function CommentaryTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
      {tags.map((tag) => {
        const tagStyle = TAG_STYLES[tag] ?? {
          background: 'rgba(106,112,144,0.1)',
          color: 'var(--text-dim)',
          border: '1px solid var(--border-hi)',
        };
        return (
          <span key={tag} style={{ ...tagPillBase, ...tagStyle }}>
            {TAG_LABELS[tag] ?? tag}
          </span>
        );
      })}
    </div>
  );
}

export function AiDesk({ draftId, commentary, picks, players }: AiDeskProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sorted = [...commentary].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  const latest = sorted[0] ?? null;

  const latestCompletedPick = picks.length > 0 ? picks[picks.length - 1] : null;
  const commentedPickIds = new Set(
    commentary.map((c) => c.pickId).filter((id): id is string => id != null),
  );
  const awaitingCommentary =
    latestCompletedPick != null &&
    !commentedPickIds.has(latestCompletedPick.id);

  const resolvePickContext = (pickId: string | null) => {
    if (!pickId) return null;
    const pick = picks.find((p) => p.id === pickId);
    if (!pick) return null;
    const player = players.find((p) => p.id === pick.playerId);
    return {
      pickNumber: pick.overallPick,
      playerName: player?.displayName ?? "Unknown",
      itemName: pick.itemName ?? "Unknown",
    };
  };

  const pendingContext = awaitingCommentary
    ? resolvePickContext(latestCompletedPick!.id)
    : null;

  useEffect(() => {
    if (!awaitingCommentary || !latestCompletedPick) return;

    const pickId = latestCompletedPick.id;
    const requestCommentary = () => {
      void fetch("/api/ai/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, pickId }),
      });
    };

    const initialTimer = setTimeout(requestCommentary, 300);
    const retryTimer = setTimeout(requestCommentary, 6000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(retryTimer);
    };
  }, [awaitingCommentary, draftId, latestCompletedPick?.id]);

  const hasContent = awaitingCommentary || sorted.length > 0;

  return (
    <section
      aria-label="AI Commissioner Commentary"
      className="flex min-h-0 flex-col max-h-[calc(100dvh-11rem)] lg:h-full lg:max-h-full"
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          textAlign: 'left',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 2px 8px',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
      >
        {collapsed ? "▲ AI Commentary" : "▼ AI Commentary"}
      </button>

      {!collapsed && (
        <div
          className="min-h-0 flex-1 overflow-y-auto"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {latest ? `New commentary: ${latest.text}` : ""}
          </div>

          {!hasContent && (
            <div
              style={{
                border: '1px dashed var(--border-hi)',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                AI commissioner commentary will appear here as picks are made.
              </p>
            </div>
          )}

          {awaitingCommentary && pendingContext && (
            <div
              className="panel-card"
              style={{
                padding: '14px',
                borderStyle: 'dashed',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                  margin: '0 0 8px 0',
                }}
              >
                {pickContextLabel(pendingContext)}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                Commissioner is reacting to this pick…
              </p>
            </div>
          )}

          {sorted.map((entry) => {
            const context = resolvePickContext(entry.pickId);
            return (
              <div key={entry.id} className="panel-card" style={{ padding: '14px' }}>
                {context && (
                  <p
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      margin: '0 0 8px 0',
                    }}
                  >
                    {pickContextLabel(context)}
                  </p>
                )}
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {entry.text}
                </p>
                <CommentaryTags tags={entry.triggerTags} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
