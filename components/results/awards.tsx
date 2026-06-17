import type { PublicAward } from "@/features/results/projection";

interface AwardsProps {
  awards: PublicAward[];
}

const awardLabels: Record<string, { label: string; emoji: string }> = {
  bestPick: { label: "Best Pick", emoji: "🏆" },
  worstPick: { label: "Worst Pick", emoji: "💩" },
  biggestSteal: { label: "Biggest Steal", emoji: "🤑" },
};

function getAwardSymbol(type: string): { symbol: string; color: string } {
  if (type === "bestPick") return { symbol: "◆", color: "var(--gold)" };
  if (type === "worstPick") return { symbol: "◈", color: "#ff4d4d" };
  if (type === "biggestSteal") return { symbol: "◉", color: "var(--cyan)" };
  return { symbol: "◆", color: "var(--text-dim)" };
}

export function Awards({ awards }: AwardsProps) {
  if (awards.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '10px' }}>
        Awards
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
        {awards.map((award) => {
          const meta = awardLabels[award.type] ?? {
            label: award.type,
            emoji: "",
          };
          const { symbol, color } = getAwardSymbol(award.type);
          return (
            <div
              key={award.type}
              className="panel-card"
              style={{ padding: '16px', textAlign: 'center' }}
            >
              <span style={{ fontSize: '20px', color, lineHeight: 1, display: 'block' }}>{symbol}</span>
              <p style={{ fontSize: '8px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '8px 0 0' }}>
                {meta.label}
              </p>
              <p style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: '16px', color: 'var(--gold-hi)', marginTop: '6px', marginBottom: 0 }}>
                {award.itemName}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 0' }}>
                by {award.playerName}
                {award.pickNumber > 0 && ` (Pick #${award.pickNumber})`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
