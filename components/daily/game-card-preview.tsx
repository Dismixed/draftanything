import type { DailyGameId } from "@/lib/streak/types";

export function GameCardPreview({ gameId }: { gameId: DailyGameId }) {
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
    default:
      return null;
  }
}
