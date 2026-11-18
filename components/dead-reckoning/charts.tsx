import { formatShort } from "@/lib/dead-reckoning/numbers";
import { dayStr, type Guess } from "@/lib/dead-reckoning/scoring";

const anchor = (x: number, width: number) => (x < width * 0.18 ? "start" : x > width * 0.82 ? "end" : "middle");

/**
 * The reveal's log-scale line: the answer as a gold diamond, your guess as a ring, and a
 * bar in the tier's colour between them. `beat` shows them in turn.
 */
export function GapLine({ answer, guess, tier, beat }: { answer: number; guess: Guess; tier: number; beat: number }) {
  const g = guess ?? answer;
  const VW = 440;
  const pad = 24;
  const L0 = Math.log(Math.min(g, answer) / 2.4);
  const L1 = Math.log(Math.max(g, answer) * 2.4);
  const x = (n: number) => pad + ((Math.log(n) - L0) / (L1 - L0)) * (VW - pad * 2);
  const ax = x(answer);
  const colour = `var(--dr-t${tier})`;
  let bar: { from: number; to: number } | null = null;
  let you: React.ReactNode = null;

  if (guess !== null) {
    const gx = x(guess);
    bar = { from: gx, to: ax };
    you = (
      <>
        <circle cx={gx} cy={38} r={5} fill="var(--dr-bg)" stroke="var(--dr-ink)" strokeWidth={2} />
        <text x={gx} y={64} fontSize={12} fill="var(--dr-ink)" textAnchor={anchor(gx, VW)}>
          you · {formatShort(guess)}
        </text>
      </>
    );
  }

  return (
    <svg className="dr-gap" viewBox={`0 0 ${VW} 74`} aria-hidden="true">
      <line x1={pad} y1={38} x2={VW - pad} y2={38} stroke="var(--dr-line)" strokeWidth={1} />
      {bar ? (
        <line
          className={`dr-gap-bar${beat >= 3 ? " on" : ""}`}
          x1={bar.from}
          y1={38}
          x2={bar.to}
          y2={38}
          stroke={colour}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ ["--len" as string]: Math.abs(bar.from - bar.to) + 1 }}
        />
      ) : null}
      {you ? <g className={`dr-gap-mk${beat >= 2 ? " on" : ""}`}>{you}</g> : null}
      <g className={`dr-gap-mk${beat >= 1 ? " on" : ""}`}>
        <path d={`M${ax} 30 l6 8 l-6 8 l-6 -8 z`} fill="var(--dr-glow)" />
        <text x={ax} y={20} fontSize={12} fontWeight={600} className="dr-mono" fill="var(--dr-glow)" textAnchor={anchor(ax, VW)}>
          {formatShort(answer)}
        </text>
      </g>
    </svg>
  );
}

/** One leg on the end screen: everyone's guesses as a histogram, the answer, and yours. */
export function CrowdStrip({
  index,
  label,
  prompt,
  answer,
  guess,
  tier,
  days,
  crowd,
  narrow,
}: {
  index: number;
  /** Shown instead of the leg number, as for the treasure island. */
  label?: string;
  prompt: string;
  answer: number;
  guess: Guess;
  tier: number;
  /** Days the leg cost; negative for days the treasure took off. */
  days: number;
  crowd: number[];
  narrow: boolean;
}) {
  const sorted = [...crowd].sort((a, b) => a - b);
  const pick = (q: number) => sorted[Math.floor(sorted.length * q)] ?? answer;
  const g = guess ?? answer;
  const L0 = Math.log(Math.min(pick(0.03), answer, g) / 1.6);
  const L1 = Math.log(Math.max(pick(0.97), answer, g) * 1.6);
  const VW = narrow ? 380 : 600;
  const x = (v: number) => 14 + ((Math.log(v) - L0) / (L1 - L0)) * (VW - 28);
  const B = 44;
  const bw = (VW - 28) / B;
  const bins = new Array<number>(B).fill(0);
  for (const v of sorted) {
    const b = Math.floor(((Math.log(v) - L0) / (L1 - L0)) * B);
    if (b >= 0 && b < B) bins[b]++;
  }
  const mx = Math.max(1, ...bins);
  const ax = x(answer);
  const gx = guess === null ? null : x(guess);

  return (
    <div className="dr-strip">
      <h4>
        <span>
          {label ? `${label} · ` : `${index + 1}. `}
          {prompt}
        </span>
        <span style={{ color: `var(--dr-t${tier})` }}>{days < 0 ? `−${dayStr(-days)}` : days === 0 ? "no days off" : dayStr(days)}</span>
      </h4>
      <svg viewBox={`0 0 ${VW} 74`} role="img" aria-label={label ? `Everyone's guesses for the ${label}` : `Everyone's guesses for leg ${index + 1}`}>
        <line x1={14} y1={40} x2={VW - 14} y2={40} stroke="var(--dr-ink2)" />
        {bins.map((c, b) =>
          c ? <rect key={b} x={14 + b * bw + 1} y={40 - (c / mx) * 26} width={bw - 2} height={(c / mx) * 26} fill="var(--dr-line)" /> : null,
        )}
        <line x1={ax} y1={8} x2={ax} y2={44} stroke="var(--dr-glow)" strokeWidth={2} />
        <text x={ax} y={5} fontSize={11} className="dr-mono" fill="var(--dr-glow)" textAnchor={anchor(ax, VW)}>
          {formatShort(answer)}
        </text>
        {gx !== null && guess !== null ? (
          <>
            <path d={`M${gx} 44 l5 9 h-10 z`} fill="var(--dr-ink)" />
            <text x={gx} y={68} fontSize={11} fill="var(--dr-ink)" textAnchor={anchor(gx, VW)}>
              you · {formatShort(guess)}
            </text>
          </>
        ) : (
          <text x={14} y={68} fontSize={11} fill="var(--dr-ink2)">
            becalmed
          </text>
        )}
      </svg>
    </div>
  );
}
