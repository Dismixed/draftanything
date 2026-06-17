"use client";

import { useState } from "react";
import type { SafeCommentary } from "@/features/draft/types";

interface AiDeskProps {
  commentary: SafeCommentary[];
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

export function AiDesk({ commentary }: AiDeskProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sorted = [...commentary].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  const latest = sorted[0] ?? null;
  const history = sorted.slice(1);

  return (
    <section aria-label="AI Commissioner Commentary">
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
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
      >
        {collapsed ? "▲ AI Commentary" : "▼ AI Commentary"}
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {latest ? `New commentary: ${latest.text}` : ""}
          </div>

          {latest ? (
            <div className="panel-card" style={{ padding: '14px' }}>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {latest.text}
              </p>
              {latest.triggerTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {latest.triggerTags.map((tag) => {
                    const tagStyle = TAG_STYLES[tag] ?? {
                      background: 'rgba(106,112,144,0.1)',
                      color: 'var(--text-dim)',
                      border: '1px solid var(--border-hi)',
                    };
                    return (
                      <span
                        key={tag}
                        style={{ ...tagPillBase, ...tagStyle }}
                      >
                        {TAG_LABELS[tag] ?? tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
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

          {history.length > 0 && (
            <details>
              <summary
                style={{
                  fontSize: '11px',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '2px 0',
                }}
              >
                Previous commentary ({history.length})
              </summary>
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                }}
              >
                {history.map((c) => (
                  <div key={c.id} className="panel-card" style={{ padding: '10px 14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                      {c.text}
                    </p>
                    {c.triggerTags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                        {c.triggerTags.map((tag) => {
                          const tagStyle = TAG_STYLES[tag] ?? {
                            background: 'rgba(106,112,144,0.1)',
                            color: 'var(--text-dim)',
                            border: '1px solid var(--border-hi)',
                          };
                          return (
                            <span
                              key={tag}
                              style={{ ...tagPillBase, ...tagStyle }}
                            >
                              {TAG_LABELS[tag] ?? tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
