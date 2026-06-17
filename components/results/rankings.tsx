import type { PublicPlayerResult } from "@/features/results/projection";

interface RankingsProps {
  ranking: PublicPlayerResult[];
}

export function Rankings({ ranking }: RankingsProps) {
  const sorted = [...ranking].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity),
  );

  function getRankBadgeStyle(rank: number | null | undefined): React.CSSProperties {
    if (rank === 1) {
      return {
        background: 'rgba(201,168,76,0.15)',
        color: 'var(--gold-hi)',
        border: '1px solid rgba(201,168,76,0.35)',
      };
    }
    if (rank === 2) {
      return {
        background: 'rgba(180,180,200,0.1)',
        color: '#a0a8c0',
        border: '1px solid rgba(180,180,200,0.25)',
      };
    }
    if (rank === 3) {
      return {
        background: 'rgba(200,120,50,0.1)',
        color: '#c87832',
        border: '1px solid rgba(200,120,50,0.25)',
      };
    }
    return {
      background: 'var(--border)',
      color: 'var(--text-dim)',
    };
  }

  return (
    <div className="panel-card" style={{ padding: 0 }}>
      <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '14px 16px 0', margin: 0 }}>
        Final Rankings
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {sorted.map((player) => (
          <li
            key={player.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                  ...getRankBadgeStyle(player.rank),
                }}
              >
                {player.rank ?? "-"}
              </span>
              <span style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: '15px', color: 'var(--text)' }}>
                {player.displayName}
              </span>
            </div>
            {player.score !== null && (
              <span style={{ color: 'var(--gold)', fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '18px' }}>
                {player.score.toFixed(1)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
