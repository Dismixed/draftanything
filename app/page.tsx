import Image from "next/image";
import Link from "next/link";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { GameCardStreak } from "@/components/streak/streak-notifier";
import { GameTitle } from "@/components/ui/game-title";
import { HotTakesHomeVisual } from "@/components/hot-takes/home-visual";
import { buildHomeJsonLd, getGameSeo, JsonLdScript } from "@/lib/seo";

/* ─── Visual Preview Components ──────────────────────────────────── */

function ChainlinkVisualRow() {
  const tiles = ["SNOW", "BALL", "PARK"];
  return (
    <div className="chainlink-preview">
      {tiles.map((word, i) => (
        <div key={word} className="chainlink-preview-segment">
          <div
            className="chainlink-preview-tile"
            style={{
              borderColor: "#c9b458",
              background: "rgba(201,180,88,0.1)",
              color: "#d4a84b",
            }}
          >
            {word}
          </div>
          {i < tiles.length - 1 && (
            <div className="chainlink-preview-link" aria-hidden>
              <svg className="chainlink-preview-link-h" width="15" height="11" viewBox="0 0 16 12" fill="none">
                <circle cx="3" cy="6" r="2.5" stroke="#484848" strokeWidth="1.5" fill="none" />
                <circle cx="13" cy="6" r="2.5" stroke="#484848" strokeWidth="1.5" fill="none" />
                <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="#484848" strokeWidth="1.5" />
              </svg>
              <svg className="chainlink-preview-link-v" width="12" height="16" viewBox="0 0 12 16" fill="none">
                <circle cx="6" cy="3" r="2.5" stroke="#484848" strokeWidth="1.5" fill="none" />
                <circle cx="6" cy="13" r="2.5" stroke="#484848" strokeWidth="1.5" fill="none" />
                <line x1="6" y1="5.5" x2="6" y2="10.5" stroke="#484848" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BrainDeadVisual() {
  const streak = [true, true, true, true, true, false];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {streak.map((correct, i) => (
          <div
            key={i}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              background: correct ? "rgba(110,186,100,0.12)" : "rgba(220,50,50,0.12)",
              border: `2px solid ${correct ? "#6eba64" : "#dc3232"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              color: correct ? "#6eba64" : "#dc3232",
              fontWeight: 700,
            }}
          >
            {correct ? "✓" : "✗"}
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "var(--bd-primary)",
          opacity: 0.65,
        }}
      >
        One wrong ends it
      </div>
    </div>
  );
}

function AnyGuessrVisual() {
  const clues = ["🏳️", "💰", "👕", "🏛", "🍕", "🌿", "🐆", "👤", "🔤", "🗺️"];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        gap: "10px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "5px" }}>
        {clues.map((icon, i) => (
          <div
            key={i}
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "5px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
            }}
          >
            {icon}
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--ag-muted)",
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          fontWeight: 600,
        }}
      >
        10 countries · 10 clue types
      </div>
    </div>
  );
}

function FreezeFramesVisual() {
  const panels = [
    { icon: "🎬", label: "Movie" },
    { icon: "🎵", label: "Song" },
    { icon: "📺", label: "TV" },
    { icon: "💿", label: "Album" },
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {panels.map((panel) => (
          <div
            key={panel.label}
            style={{
              width: "64px",
              height: "60px",
              background: "rgba(168,85,247,0.07)",
              border: "1px solid rgba(168,85,247,0.22)",
              borderRadius: "6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{panel.icon}</span>
            <span
              style={{
                fontSize: "8px",
                color: "#a855f7",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {panel.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BallKnowledgeVisual() {
  const chips = [
    "Pizza Toppings",
    "90s Cartoons",
    "Dog Breeds",
    "US Capitals",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          minWidth: "72px",
          minHeight: "72px",
          flexShrink: 0,
          aspectRatio: "1",
          borderRadius: "50%",
          border: "3px solid #5b9ee8",
          background: "rgba(91,158,232,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#5b9ee8",
            fontFamily: '"Teko", sans-serif',
            letterSpacing: "0.02em",
          }}
        >
          0:60
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "5px",
          maxWidth: "220px",
          flexShrink: 0,
        }}
      >
        {chips.map((chip) => (
          <span
            key={chip}
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#8ba3c9",
              background: "rgba(91,158,232,0.1)",
              border: "1px solid rgba(91,158,232,0.22)",
              borderRadius: "20px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function GettingWarmerVisual() {
  const clues = ["Refreshing", "Heavy", "???"];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        height: "100%",
      }}
    >
      {clues.map((clue, i) => (
        <div
          key={clue}
          style={{
            width: "148px",
            padding: "5px 8px",
            borderRadius: "6px",
            fontSize: "9px",
            fontFamily: '"IBM Plex Mono", monospace',
            background:
              i < 2
                ? "linear-gradient(135deg, rgba(255,107,26,0.15), rgba(255,107,26,0.04))"
                : "rgba(38,49,61,0.6)",
            border:
              i < 2
                ? "1px solid rgba(255,150,60,0.35)"
                : "1px solid rgba(255,255,255,0.06)",
            color: i < 2 ? "#fff3e8" : "#7c8a99",
            opacity: i < 2 ? 1 : 0.55,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: i < 2 ? "#ff6b1a" : "rgba(255,255,255,0.06)",
              color: i < 2 ? "#1a0a02" : "#7c8a99",
              fontSize: "7px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>
          {clue}
        </div>
      ))}
      <span style={{ fontSize: "12px", marginTop: "2px", lineHeight: 1 }}>❄️❄️🔥</span>
    </div>
  );
}

function SlipperySlopeVisual() {
  const board = [
    [1, 2, 3, 4, 5],
    [10, 9, 8, 7, 6],
    [11, 12, 13, 14, 15],
    [20, 19, 18, 17, 16],
  ];
  const current = 8;
  const visited = new Set([1, 2, 3, 4, 5, 6, 7]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
      }}
    >
      <div style={{ display: "grid", gridTemplateRows: "repeat(4, auto)", gap: "3px" }}>
        {board.map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: "3px" }}>
            {row.map((cell) => {
              const isCurrent = cell === current;
              const isVisited = visited.has(cell);
              return (
                <div
                  key={cell}
                  style={{
                    width: "26px",
                    height: "22px",
                    borderRadius: "2px",
                    background: isCurrent
                      ? "var(--ss-lime)"
                      : isVisited
                      ? "rgba(181,242,61,0.18)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      isCurrent
                        ? "var(--ss-lime)"
                        : isVisited
                        ? "rgba(181,242,61,0.3)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "7px",
                    fontWeight: 700,
                    color: isCurrent
                      ? "#0d1117"
                      : isVisited
                      ? "rgba(181,242,61,0.8)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  {cell}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftAnythingVisual() {
  const rosters = [
    { player: "You", picks: ["Nolan", "Murakami", "Beyoncé"] },
    { player: "Alex", picks: ["Scorsese", "LeBron", "Swift"] },
  ];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        gap: "16px",
      }}
    >
      {rosters.map((roster) => (
        <div
          key={roster.player}
          style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "90px" }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--gold)",
              opacity: 0.8,
              marginBottom: "2px",
            }}
          >
            {roster.player}
          </div>
          {roster.picks.map((pick, i) => (
            <div
              key={pick}
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: i === 0 ? "var(--gold-hi)" : "var(--text-dim)",
                background: i === 0 ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  i === 0 ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: "4px",
                padding: "5px 8px",
                textAlign: "center",
              }}
            >
              {pick}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Shared styles ───────────────────────────────────────────────── */

const eyebrow = {
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.32em",
  textTransform: "uppercase" as const,
};

const modeHint = {
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  color: "var(--text-dim)",
  opacity: 0.75,
};

const cta = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const cardTitleSection = {
  padding: "16px 20px 14px",
  minHeight: "128px",
  boxSizing: "border-box" as const,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "flex-start",
};

const cardDescription = {
  fontSize: "12px",
  lineHeight: 1.5,
  margin: "8px 0 0",
  fontWeight: 300,
};

const cardVisualSection = {
  height: "144px",
  minHeight: "144px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cardActionSection = {
  padding: "12px 20px 16px",
  minHeight: "46px",
  boxSizing: "border-box" as const,
  display: "flex",
  alignItems: "center",
};

const partyVisualSection = {
  height: "128px",
  minHeight: "128px",
  padding: "8px 12px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const partyActionSection = {
  padding: "18px 28px 24px",
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
};

/* ─── Card shell ──────────────────────────────────────────────────── */

function GameCard({
  href,
  bg,
  border,
  radius = "10px",
  children,
}: {
  href: string;
  bg: string;
  border: string;
  radius?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} style={{ display: "block", textDecoration: "none" }}>
      <div
        className="stim-hero-card"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: radius,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          minHeight: "320px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </Link>
  );
}

function Divider({ color }: { color: string }) {
  return <div style={{ height: "1px", background: color, margin: "0 20px", flexShrink: 0 }} />;
}

function SectionLabel({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "16px",
      }}
    >
      <h2
        style={{
          ...eyebrow,
          color: accent,
          opacity: 0.9,
          margin: 0,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </h2>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: `linear-gradient(90deg, ${accent}44, transparent)`,
        }}
      />
    </div>
  );
}

/* ─── Coming soon ─────────────────────────────────────────────────── */

const COMING_SOON = [
  { name: "Would You Rather", icon: "VS", description: "Pick a side. Make the room argue." },
  { name: "Scattergories", icon: "A", description: "A letter, a timer, twelve categories." },
];

/* ─── Page ────────────────────────────────────────────────────────── */

export default function StimGames() {
  return (
    <main
      className="game-page"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 24px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <JsonLdScript data={buildHomeJsonLd()} />
      {/* Atmospheric gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(124,58,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 35% at 80% 85%, rgba(201,168,76,0.06) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
          <SoundToggle />
        </div>

        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
            paddingRight: "40px",
          }}
        >
          <Image
            src="/stimlabs_badge_v5.svg"
            alt="Stim Labs"
            width={64}
            height={74}
            priority
            unoptimized
            style={{
              width: "64px",
              height: "auto",
              flexShrink: 0,
              display: "block",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(26px, 5.5vw, 34px)",
                fontWeight: 900,
                lineHeight: 1.1,
                color: "var(--text)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Stim{" "}
              <em
                style={{
                  fontStyle: "italic",
                  color: "var(--gold-hi)",
                }}
              >
                Games
              </em>
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-dim)",
                lineHeight: 1.45,
                margin: "6px 0 0",
                fontWeight: 300,
              }}
            >
              Daily puzzles and a few games for the group chat.
            </p>
          </div>
        </header>

        {/* ── DAILY GAMES ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "36px" }}>
          <SectionLabel accent="var(--cl-green)">Daily game rotation</SectionLabel>
          <Link href="/chainlink" style={{ display: "block", textDecoration: "none" }}>
            <div
              className="stim-hero-card"
              style={{
                background: "var(--cl-card)",
                border: "2px solid var(--cl-border)",
                borderRadius: "6px",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  top: "-40%",
                  right: "-5%",
                  width: "400px",
                  height: "400px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(201,180,88,0.06) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              {/* Title */}
              <div style={{ padding: "28px 36px 20px", position: "relative" }}>
                <div style={{ ...eyebrow, color: "var(--cl-green)", opacity: 0.9, marginBottom: "8px" }}>
                  Word Game
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <GameTitle
                    game="chainlink"
                    as="h2"
                    style={{
                      fontSize: "clamp(28px, 5vw, 38px)",
                      fontWeight: 700,
                      lineHeight: 0.95,
                      color: "var(--cl-text)",
                      margin: 0,
                    }}
                  />
                  <GameCardStreak gameId="chainlink" accentColor="var(--cl-yellow)" inline />
                </div>
                <p style={{ ...modeHint, color: "var(--cl-gray-dim)", margin: "8px 0 0" }}>
                  Solo · Daily puzzle
                </p>
                <p style={{ ...cardDescription, color: "var(--cl-gray-dim)" }}>
                  {getGameSeo("chainlink").description}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--cl-border)", margin: "0 36px" }} />

              {/* Visual */}
              <div
                style={{
                  padding: "28px 36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChainlinkVisualRow />
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--cl-border)", margin: "0 36px" }} />

              {/* CTA */}
              <div style={{ padding: "16px 36px 24px" }}>
                <div
                  className="stim-text-link"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    ...cta,
                    color: "var(--cl-yellow)",
                  }}
                >
                  Play Chainlink
                  <span style={{ fontSize: "12px" }}>&#8594;</span>
                </div>
              </div>
            </div>
          </Link>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >

          {/* Brain Dead */}
          <div
            className="stim-hero-card"
            style={{
              background: "var(--bd-surface)",
              border: "1px solid var(--bd-border)",
              borderRadius: "10px",
              overflow: "hidden",
              position: "relative",
              minHeight: "320px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Link
              href="/brain-dead/daily"
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "var(--bd-primary)",
                }}
              />
              {/* Title */}
              <div style={cardTitleSection}>
                <div style={{ ...eyebrow, color: "var(--bd-primary)", marginBottom: "5px" }}>
                  Trivia
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <GameTitle
                    game="brain-dead"
                    as="h2"
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--bd-text)",
                      margin: 0,
                      letterSpacing: "-0.5px",
                    }}
                  />
                  <GameCardStreak gameId="brain-dead" accentColor="var(--bd-primary)" inline />
                </div>
                <p style={{ ...modeHint, margin: "6px 0 0" }}>Solo · Daily + Freeplay</p>
                <p style={{ ...cardDescription, color: "var(--bd-muted, var(--text-dim))" }}>
                  {getGameSeo("brain-dead").description}
                </p>
              </div>
              <Divider color="var(--bd-border)" />
              {/* Visual */}
              <div style={cardVisualSection}>
                <BrainDeadVisual />
              </div>
            </Link>
            <Divider color="var(--bd-border)" />
            {/* CTA */}
            <div
              style={{
                ...cardActionSection,
                justifyContent: "space-between",
                gap: "12px",
                width: "100%",
              }}
            >
              <Link href="/brain-dead/daily" style={{ textDecoration: "none" }}>
                <span className="stim-text-link" style={{ ...cta, color: "var(--bd-primary)" }}>
                  Start the daily &#8594;
                </span>
              </Link>
              <Link href="/brain-dead" style={{ textDecoration: "none" }}>
                <span
                  className="stim-text-link"
                  style={{ ...cta, color: "var(--bd-primary)", opacity: 0.72 }}
                >
                  Pick a mode &#8594;
                </span>
              </Link>
            </div>
          </div>

          {/* AnyGuessr */}
          <GameCard
            href="/anyguessr/daily"
            bg="var(--ag-surface)"
            border="var(--ag-border)"
          >
            {/* Title */}
            <div style={cardTitleSection}>
              <div style={{ ...eyebrow, color: "var(--ag-accent)", marginBottom: "5px" }}>
                Country Guessing
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <GameTitle
                  game="anyguessr"
                  as="h2"
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "var(--ag-text)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                />
                <GameCardStreak gameId="anyguessr" accentColor="var(--ag-accent)" inline />
              </div>
              <p style={{ ...modeHint, color: "var(--ag-muted)", margin: "6px 0 0" }}>
                Solo · Daily
              </p>
              <p style={{ ...cardDescription, color: "var(--ag-muted)" }}>
                {getGameSeo("anyguessr").description}
              </p>
            </div>
            <Divider color="var(--ag-border)" />
            {/* Visual */}
            <div style={cardVisualSection}>
              <AnyGuessrVisual />
            </div>
            <Divider color="var(--ag-border)" />
            {/* CTA */}
            <div style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ag-accent)" }}>
                Guess today&apos;s countries &#8594;
              </span>
            </div>
          </GameCard>

          {/* Hot Takes */}
          <GameCard
            href="/hot-takes"
            bg="var(--ht-surface)"
            border="var(--ht-line)"
            radius="14px"
          >
            {/* Title */}
            <div style={cardTitleSection}>
              <div style={{ ...eyebrow, color: "var(--ht-accent)", marginBottom: "5px" }}>
                Tier Game
              </div>
              <GameTitle
                game="hot-takes"
                as="h2"
                style={{
                  fontSize: "22px",
                  fontWeight: 900,
                  fontStyle: "italic",
                  lineHeight: 1,
                  color: "var(--ht-text)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              />
              <p style={{ ...modeHint, color: "var(--ht-text-dim)", margin: "6px 0 0" }}>
                Solo · Daily
              </p>
              <p style={{ ...cardDescription, color: "var(--ht-text-dim)" }}>
                {getGameSeo("hot-takes").description}
              </p>
            </div>
            <Divider color="var(--ht-line)" />
            {/* Visual */}
            <div style={cardVisualSection}>
              <HotTakesHomeVisual />
            </div>
            <Divider color="var(--ht-line)" />
            {/* CTA */}
            <div style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ht-accent)" }}>
                Rank today&apos;s list &#8594;
              </span>
            </div>
          </GameCard>

          {/* FreezeFrames */}
          <GameCard
            href="/freezeframes/daily"
            bg="var(--ff-surface)"
            border="var(--ff-border)"
            radius="14px"
          >
            {/* Title */}
            <div style={cardTitleSection}>
              <div style={{ ...eyebrow, color: "var(--ff-purple-light)", marginBottom: "5px" }}>
                Movie · Song · TV · Album
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <GameTitle
                  game="freezeframes"
                  as="h2"
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: "22px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--ff-text)",
                    margin: 0,
                    letterSpacing: "-0.04em",
                  }}
                />
                <GameCardStreak gameId="freezeframes" accentColor="var(--ff-purple-light)" inline />
              </div>
              <p style={{ ...modeHint, color: "var(--ff-muted)", margin: "6px 0 0" }}>
                Solo · Daily
              </p>
              <p style={{ ...cardDescription, color: "var(--ff-muted)" }}>
                {getGameSeo("freezeframes").description}
              </p>
            </div>
            <Divider color="var(--ff-border)" />
            {/* Visual */}
            <div style={cardVisualSection}>
              <FreezeFramesVisual />
            </div>
            <Divider color="var(--ff-border)" />
            {/* CTA */}
            <div style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ff-purple-light)" }}>
                Play the four rounds &#8594;
              </span>
            </div>
          </GameCard>

          {/* Ball Knowledge */}
          <GameCard
            href="/ball-knowledge/daily"
            bg="var(--bk-backboard)"
            border="var(--bk-line)"
            radius="14px"
          >
            {/* Title */}
            <div style={cardTitleSection}>
              <div style={{ ...eyebrow, color: "var(--bk-net-blue)", marginBottom: "5px" }}>
                Any Topic · 60 Seconds
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <GameTitle
                  game="ball-knowledge"
                  as="h2"
                  style={{
                    fontFamily: '"Teko", sans-serif',
                    fontSize: "26px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--bk-chalk)",
                    margin: 0,
                    letterSpacing: "0.01em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                />
                <GameCardStreak gameId="ball-knowledge" accentColor="var(--bk-net-blue)" inline />
              </div>
              <p style={{ ...modeHint, color: "var(--bk-chalk-dim)", margin: "6px 0 0" }}>
                Solo · Daily
              </p>
              <p style={{ ...cardDescription, color: "var(--bk-chalk-dim)" }}>
                {getGameSeo("ball-knowledge").description}
              </p>
            </div>
            <Divider color="var(--bk-line)" />
            {/* Visual */}
            <div style={cardVisualSection}>
              <BallKnowledgeVisual />
            </div>
            <Divider color="var(--bk-line)" />
            {/* CTA */}
            <div style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--bk-net-blue)" }}>
                Start the clock &#8594;
              </span>
            </div>
          </GameCard>

          {/* Getting Warmer */}
          <GameCard
            href="/getting-warmer/daily"
            bg="var(--gw-bg)"
            border="rgba(255,107,26,0.25)"
            radius="14px"
          >
            <div style={cardTitleSection}>
              <div style={{ ...eyebrow, color: "var(--gw-orange)", marginBottom: "5px" }}>
                Word Puzzle · Unlimited Guesses
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <GameTitle
                  game="getting-warmer"
                  as="h2"
                  style={{
                    fontFamily: '"Bebas Neue", sans-serif',
                    fontSize: "26px",
                    fontWeight: 400,
                    lineHeight: 1,
                    color: "var(--gw-ink)",
                    margin: 0,
                    letterSpacing: "0.03em",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                />
                <GameCardStreak gameId="getting-warmer" accentColor="var(--gw-orange)" inline />
              </div>
              <p style={{ ...modeHint, color: "var(--gw-ink-dim)", margin: "6px 0 0" }}>
                Solo · Daily
              </p>
              <p style={{ ...cardDescription, color: "var(--gw-ink-dim)" }}>
                {getGameSeo("getting-warmer").description}
              </p>
            </div>
            <Divider color="rgba(255,107,26,0.2)" />
            <div style={cardVisualSection}>
              <GettingWarmerVisual />
            </div>
            <Divider color="rgba(255,107,26,0.2)" />
            <div style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--gw-orange)" }}>
                Reveal the clues &#8594;
              </span>
            </div>
          </GameCard>
          </div>
        </section>

        {/* ── PLAY TOGETHER ─────────────────────────────────────────── */}
        <section style={{ marginBottom: "36px" }}>
          <SectionLabel accent="var(--gold)">Play together later</SectionLabel>
          <div
            className="stim-party-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            <Link href="/draft-anything" style={{ display: "block", textDecoration: "none" }}>
              <div
                className="stim-hero-card stim-party-card"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(124,58,255,0.07) 100%)",
                  border: "1px solid rgba(201,168,76,0.32)",
                  borderRadius: "12px",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  height: "100%",
                  minHeight: "320px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "8%",
                    right: "8%",
                    height: "1px",
                    background:
                      "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "-30%",
                    right: "-15%",
                    width: "260px",
                    height: "260px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ padding: "28px 28px 16px", position: "relative" }}>
                  <div style={{ ...eyebrow, color: "var(--gold)", opacity: 0.85, marginBottom: "8px" }}>
                    Party Game
                  </div>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "clamp(28px, 5vw, 36px)",
                      fontWeight: 900,
                      lineHeight: 0.95,
                      color: "var(--text)",
                      margin: "0 0 6px",
                    }}
                  >
                    Draft{" "}
                    <em
                      style={{
                        fontStyle: "italic",
                        color: "var(--gold-hi)",
                        textShadow: "0 0 30px rgba(240,200,96,0.15)",
                      }}
                    >
                      Anything
                    </em>
                  </h2>
                  <p style={{ ...modeHint, margin: "0 0 10px" }}>Multiplayer · 2+ players</p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-dim)",
                      lineHeight: 1.6,
                      margin: 0,
                      fontWeight: 300,
                    }}
                  >
                    Pick the best lineup you can, then explain the choices when everyone
                    starts judging.
                  </p>
                </div>
                <div style={partyVisualSection}>
                  <DraftAnythingVisual />
                </div>
                <div style={partyActionSection}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(201,168,76,0.14)",
                      border: "1px solid rgba(201,168,76,0.35)",
                      padding: "10px 18px",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--gold-hi)",
                    }}
                  >
                    Create a room
                    <span style={{ fontSize: "12px" }}>&#8594;</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/slippery-slope" style={{ display: "block", textDecoration: "none" }}>
              <div
                className="stim-hero-card stim-party-card"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(181,242,61,0.08) 0%, rgba(20,30,10,0.6) 100%)",
                  border: "1px solid rgba(181,242,61,0.28)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  cursor: "pointer",
                  height: "100%",
                  minHeight: "320px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "8%",
                    right: "8%",
                    height: "1px",
                    background:
                      "linear-gradient(90deg, transparent, rgba(181,242,61,0.45), transparent)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: "-20%",
                    left: "-10%",
                    width: "240px",
                    height: "240px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(181,242,61,0.08) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ padding: "28px 28px 16px", position: "relative" }}>
                  <div style={{ ...eyebrow, color: "var(--ss-lime)", opacity: 0.9, marginBottom: "8px" }}>
                    Trivia + Board Game
                  </div>
                  <GameTitle
                    game="slippery-slope"
                    as="h2"
                    style={{
                      fontSize: "clamp(26px, 4.5vw, 32px)",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--ss-text)",
                      margin: "0 0 6px",
                    }}
                  />
                  <p style={{ ...modeHint, color: "var(--ss-muted)", margin: "0 0 10px" }}>
                    Solo or multiplayer
                  </p>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--ss-muted)",
                      lineHeight: 1.6,
                      margin: 0,
                      fontWeight: 300,
                      opacity: 0.9,
                    }}
                  >
                    Answer trivia to move up the board. Miss at the wrong time and someone
                    else takes the lead.
                  </p>
                </div>
                <div style={partyVisualSection}>
                  <SlipperySlopeVisual />
                </div>
                <div style={partyActionSection}>
                  <span
                    className="stim-text-link"
                    style={{
                      ...cta,
                      color: "var(--ss-lime)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(181,242,61,0.1)",
                      border: "1px solid rgba(181,242,61,0.3)",
                      padding: "10px 18px",
                    }}
                  >
                    Open the board &#8594;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Coming Soon ───────────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              ...eyebrow,
              color: "var(--text-dim)",
              opacity: 0.6,
              margin: "0 0 16px",
            }}
          >
            Coming Soon
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {COMING_SOON.map((game) => (
              <div
                key={game.name}
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  padding: "24px",
                  position: "relative",
                  opacity: 0.55,
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(124,58,255,0.08)",
                    border: "1px solid var(--border-hi)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--purple)",
                    marginBottom: "14px",
                    fontFamily: "monospace",
                  }}
                >
                  {game.icon}
                </div>
                <h4
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text)",
                    margin: "0 0 6px",
                  }}
                >
                  {game.name}
                </h4>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-dim)",
                    margin: 0,
                    lineHeight: 1.5,
                    fontWeight: 300,
                  }}
                >
                  {game.description}
                </p>
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    fontSize: "8px",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border)",
                    padding: "4px 8px",
                  }}
                >
                  Soon
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "var(--text-dim)",
            marginTop: "48px",
            opacity: 0.4,
            letterSpacing: "0.08em",
          }}
        >
          Built by Stim Labs
        </p>
      </div>
    </main>
  );
}
