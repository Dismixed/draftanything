import type { PublicPlayerResult } from "@/features/results/build-public-result";

interface WinnerRevealProps {
  winner: PublicPlayerResult;
  topic: string;
}

export function WinnerReveal({ winner, topic }: WinnerRevealProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.03) 100%)',
      border: '1px solid rgba(201,168,76,0.3)',
      position: 'relative',
      padding: '32px 24px',
      textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* Gold glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.1), transparent)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '10px' }}>
          Winner
        </p>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(32px,8vw,48px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--gold-hi)', textShadow: '0 0 40px rgba(240,200,96,0.25)', margin: '0 0 12px', lineHeight: 1 }}>
          {winner.displayName}
        </h2>
        {winner.score !== null && (
          <p style={{ fontSize: '52px', fontWeight: 900, fontFamily: '"Playfair Display", serif', color: 'var(--gold)', lineHeight: 1, marginBottom: '8px' }}>
            {winner.score.toFixed(1)}
            <span style={{ fontSize: '18px', color: 'var(--text-dim)', fontWeight: 400 }}>/10</span>
          </p>
        )}
        <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Best draft of <span style={{ color: 'var(--text)', fontStyle: 'italic' }}>{topic}</span>
        </p>
      </div>
    </div>
  );
}
