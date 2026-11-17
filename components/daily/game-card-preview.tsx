import { useId } from "react";
import type { DailyGameId } from "@/lib/streak/types";

/** Games whose preview is a picture that fills the whole box rather than a small scaled motif. */
const FILLS: ReadonlySet<DailyGameId> = new Set(["dead-reckoning"]);

export function GameCardPreview({
  gameId,
  size = "sm",
}: {
  gameId: DailyGameId;
  size?: "sm" | "lg";
}) {
  return (
    <div className={`od-preview-frame od-preview-frame-${size}${FILLS.has(gameId) ? " is-fill" : ""}`} aria-hidden>
      {renderPreview(gameId)}
    </div>
  );
}

function renderPreview(gameId: DailyGameId) {
  switch (gameId) {
    case "chainlink":
      return (
        <div className="od-preview od-preview-chainlink" aria-hidden>
          {["SNOW", "BALL", "PARK"].map((word, i) => (
            <span key={word} className="od-preview-tile">
              {word}
              {i < 2 ? <span className="od-preview-link">·</span> : null}
            </span>
          ))}
        </div>
      );
    case "brain-dead":
      return (
        <div className="od-preview od-preview-brain" aria-hidden>
          {[true, true, true, false].map((ok, i) => (
            <span key={i} className={`od-preview-dot${ok ? " ok" : " miss"}`}>
              {ok ? "✓" : "✗"}
            </span>
          ))}
        </div>
      );
    case "anyguessr":
      return (
        <div className="od-preview od-preview-anyguessr" aria-hidden>
          {["🏳️", "💰", "🏛", "🍕"].map((icon) => (
            <span key={icon} className="od-preview-chip">
              {icon}
            </span>
          ))}
        </div>
      );
    case "freezeframes":
      return (
        <div className="od-preview od-preview-ff" aria-hidden>
          {["🎬", "🎵", "📺", "💿"].map((icon) => (
            <span key={icon} className="od-preview-chip">
              {icon}
            </span>
          ))}
        </div>
      );
    case "ball-knowledge":
      return (
        <div className="od-preview od-preview-bk" aria-hidden>
          <span className="od-preview-clock">0:60</span>
        </div>
      );
    case "hot-takes":
      return (
        <div className="od-preview od-preview-ht" aria-hidden>
          {["S", "A", "B", "C"].map((tier) => (
            <span key={tier} className="od-preview-tier">
              {tier}
            </span>
          ))}
        </div>
      );
    case "getting-warmer":
      return (
        <div className="od-preview od-preview-gw" aria-hidden>
          {[
            { n: "1", label: "Refreshing", hot: true },
            { n: "2", label: "Heavy", hot: true },
            { n: "3", label: "???", hot: false },
          ].map((clue) => (
            <span
              key={clue.n}
              className={`od-preview-gw-clue${clue.hot ? " hot" : ""}`}
            >
              <span className="od-preview-gw-num">{clue.n}</span>
              {clue.label}
            </span>
          ))}
        </div>
      );
    case "dead-reckoning":
      return <SeaChart />;
    default:
      return null;
  }
}

/** Islands on a chart, joined by crossings coloured by how close each guess was, the ship part way along. */
const ISLANDS: ReadonlyArray<[number, number, number]> = [
  [34, 88, 1],
  [86, 58, 0.9],
  [140, 80, 1.05],
  [188, 40, 0.85],
];

function SeaChart() {
  const id = useId().replace(/:/g, "");
  return (
    <svg className="drs-chart" viewBox="0 0 220 130" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--drs-sea1)" />
          <stop offset="1" stopColor="var(--drs-sea2)" />
        </linearGradient>
        <radialGradient id={`${id}shoal`}>
          <stop offset="0.55" stopColor="var(--drs-shoal)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--drs-shoal)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="220" height="130" fill={`url(#${id}sea)`} />
      <g stroke="var(--drs-grid)" strokeWidth="0.6">
        {[40, 80, 120, 160, 200].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="130" />
        ))}
        {[35, 70, 105].map((y) => (
          <line key={y} x1="0" y1={y} x2="220" y2={y} />
        ))}
      </g>
      {ISLANDS.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="20" fill={`url(#${id}shoal)`} />
      ))}
      <path d="M34 88 L86 58" stroke="#b01e7a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M86 58 C100 70,104 52,114 66 S128 74,140 80" stroke="#17698a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M140 80 C152 70,160 64,166 56" stroke="var(--drs-route)" strokeWidth="2" fill="none" strokeDasharray="1 4.5" strokeLinecap="round" />
      <path d="M170 52 L188 40" stroke="var(--drs-route)" strokeWidth="2" fill="none" strokeDasharray="1 4.5" strokeLinecap="round" opacity="0.55" />
      {ISLANDS.map(([x, y, s], i) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse rx="11" ry="6.5" fill="#e9d29b" />
          <ellipse cx="-1" cy="-1" rx="7" ry="4" fill="#7fae6a" />
          {i === 0 ? (
            <>
              <rect x="-6" y="-4" width="4" height="3" fill="#c0633f" />
              <rect x="0" y="-5" width="4" height="3" fill="#c0633f" />
            </>
          ) : null}
          {i === 2 ? <path d="M2 -3 l0 -8 M2 -11 q4 1 6 -2 M2 -11 q-4 1 -6 -2" stroke="#3e6b3a" strokeWidth="1.2" fill="none" /> : null}
        </g>
      ))}
      <g transform="translate(166 56) rotate(-35)">
        <path d="M-7 2 Q0 6 7 2 L5 -1 L-5 -1Z" fill="#6b4423" />
        <path d="M-1 -1 L-1 -12 L5 -3Z" fill="#fbf6ea" />
        <path d="M-2 -1 L-2 -10 L-7 -3Z" fill="#f1e8d4" />
      </g>
      <g transform="translate(204 112)" stroke="var(--drs-route)" strokeWidth="0.8" fill="none" opacity="0.7">
        <circle r="7" />
        <path d="M0 -10 L2 0 L0 10 L-2 0Z" fill="var(--drs-route)" />
      </g>
    </svg>
  );
}
