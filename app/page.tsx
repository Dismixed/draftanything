import Image from "next/image";
import Link from "next/link";
import { GameCardStreak } from "@/components/streak/streak-notifier";
import { GameTitle } from "@/components/ui/game-title";
import { HotTakesHomeVisual } from "@/components/hot-takes/home-visual";
import { buildHomeJsonLd, getGameSeo, JsonLdScript } from "@/lib/seo";

/* ─── Visual Preview Components ──────────────────────────────────── */

function ChainlinkVisualRow() {
  const tiles = ["SNOW", "BALL", "PARK"];
  return (
    <div className="chainlink-preview stim-visual-wide">
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
  const streak = [true, true, true, true, false];
  return (
    <div className="brain-dead-preview">
      <div className="brain-dead-preview-dots">
        {streak.map((correct, i) => (
          <div
            key={i}
            className={`brain-dead-preview-dot${correct ? " ok" : " miss"}`}
          >
            {correct ? "✓" : "✗"}
          </div>
        ))}
      </div>
      <div className="brain-dead-preview-caption">One wrong ends it</div>
    </div>
  );
}

function AnyGuessrVisual() {
  const clues = [
    { icon: "🏳️", label: "Flag" },
    { icon: "💰", label: "Currency" },
    { icon: "🏛", label: "Landmark" },
    { icon: "🗺️", label: "Map" },
  ];
  return (
    <div className="anyguessr-preview">
      <div className="anyguessr-preview-grid">
        {clues.map((clue) => (
          <div key={clue.label} className="anyguessr-preview-chip" title={clue.label}>
            {clue.icon}
          </div>
        ))}
      </div>
      <div className="anyguessr-preview-caption">Guess the country</div>
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
              border: "1px solid color-mix(in srgb, var(--ff-purple-light) 28%, transparent)",
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
                color: "var(--ff-purple-light)",
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
          border: "3px solid var(--bk-net-blue)",
          background: "color-mix(in srgb, var(--bk-net-blue) 10%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--bk-net-blue)",
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
              color: "var(--bk-chalk-dim)",
              background: "color-mix(in srgb, var(--bk-net-blue) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--bk-net-blue) 28%, transparent)",
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
                : "var(--gw-cold-slate)",
            border:
              i < 2
                ? "1px solid rgba(255,150,60,0.35)"
                : "1px solid color-mix(in srgb, var(--gw-cold-slate-text) 35%, transparent)",
            color: i < 2 ? "var(--gw-ink)" : "var(--gw-cold-slate-text)",
            opacity: i < 2 ? 1 : 0.85,
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
              background: i < 2 ? "var(--gw-orange)" : "color-mix(in srgb, var(--gw-cold-slate-text) 22%, transparent)",
              color: i < 2 ? "#1a0a02" : "var(--gw-cold-slate-text)",
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
                      ? "color-mix(in srgb, var(--ss-lime) 18%, transparent)"
                      : "var(--ss-surface2)",
                    border: `1px solid ${
                      isCurrent
                        ? "var(--ss-lime)"
                        : isVisited
                        ? "color-mix(in srgb, var(--ss-lime) 40%, transparent)"
                        : "var(--ss-border)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "7px",
                    fontWeight: 700,
                    color: isCurrent
                      ? "var(--ss-on-accent)"
                      : isVisited
                      ? "var(--ss-lime)"
                      : "var(--ss-cell-num)",
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
                background: i === 0 ? "rgba(201,168,76,0.14)" : "var(--panel-alt)",
                border: `1px solid ${
                  i === 0 ? "rgba(201,168,76,0.4)" : "var(--border)"
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

const cta = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const cardTitleSection = {
  padding: "16px 20px 14px",
  minHeight: "96px",
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
  overflow: "hidden",
  position: "relative" as const,
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

const cardTitleClass = "stim-card-title";
const cardDescClass = "stim-card-desc";
const cardVisualClass = "stim-card-visual";
const cardActionClass = "stim-card-action";
const partyVisualClass = "stim-party-visual";
const partyActionClass = "stim-party-action";

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
        className="stim-hero-card stim-game-card"
        style={{
          background: bg,
          border: `1.5px solid ${border}`,
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
  return (
    <div
      className="stim-card-rule"
      style={{ height: "1px", background: color, margin: "0 20px", flexShrink: 0 }}
    />
  );
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
      className="stim-section-label"
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

      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <header
          className="stim-home-header"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "14px",
            marginBottom: "36px",
          }}
        >
          <Image
            src="/stimlabs_badge_v5.svg"
            alt="Stim Labs"
            width={80}
            height={92}
            priority
            unoptimized
            style={{
              width: "80px",
              height: "auto",
              flexShrink: 0,
              display: "block",
            }}
          />
          <div style={{ minWidth: 0, maxWidth: "28rem" }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(32px, 6.5vw, 42px)",
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
                fontSize: "15px",
                color: "var(--text-dim)",
                lineHeight: 1.5,
                margin: "8px 0 0",
                fontWeight: 300,
              }}
            >
              Daily puzzles and a few games for the group chat.
            </p>
          </div>
        </header>

        {/* ── DAILY GAMES ─────────────────────────────────────────── */}
        <section className="stim-home-section" style={{ marginBottom: "36px" }}>
          <SectionLabel accent="var(--cl-green)">Daily game rotation</SectionLabel>
          <div
            className="stim-daily-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))",
              gap: "14px",
            }}
          >
          {/* Chainlink */}
          <GameCard
            href="/chainlink"
            bg="var(--cl-card)"
            border="color-mix(in srgb, var(--cl-yellow) 65%, transparent)"
          >
            <div className={cardTitleClass} style={cardTitleSection}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <GameTitle
                  game="chainlink"
                  as="h2"
                  style={{
                    fontSize: "28px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--cl-text)",
                    margin: 0,
                  }}
                />
                <GameCardStreak gameId="chainlink" accentColor="var(--cl-yellow)" inline />
              </div>
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--cl-gray-dim)" }}>
                {getGameSeo("chainlink").description}
              </p>
            </div>
            <Divider color="var(--cl-border)" />
            <div className={cardVisualClass} style={cardVisualSection}>
              <ChainlinkVisualRow />
            </div>
            <Divider color="var(--cl-border)" />
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--cl-yellow)" }}>
                Play Chain Link &#8594;
              </span>
            </div>
          </GameCard>

          {/* Brain Dead */}
          <GameCard
            href="/brain-dead/daily"
            bg="var(--bd-surface)"
            border="color-mix(in srgb, var(--bd-primary) 65%, transparent)"
          >
            <div className={cardTitleClass} style={cardTitleSection}>
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
                    fontSize: "28px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--bd-text)",
                    margin: 0,
                    letterSpacing: "-0.5px",
                  }}
                />
                <GameCardStreak gameId="brain-dead" accentColor="var(--bd-primary)" inline />
              </div>
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--bd-muted, var(--text-dim))" }}>
                {getGameSeo("brain-dead").description}
              </p>
            </div>
            <Divider color="var(--bd-border)" />
            <div className={cardVisualClass} style={cardVisualSection}>
              <BrainDeadVisual />
            </div>
            <Divider color="var(--bd-border)" />
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--bd-primary)" }}>
                Start the daily &#8594;
              </span>
            </div>
          </GameCard>

          {/* AnyGuessr */}
          <GameCard
            href="/anyguessr/daily"
            bg="var(--ag-surface)"
            border="color-mix(in srgb, var(--ag-brand) 55%, transparent)"
          >
            {/* Title */}
            <div className={cardTitleClass} style={cardTitleSection}>
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
                    fontSize: "28px",
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "var(--ag-text)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                />
                <GameCardStreak gameId="anyguessr" accentColor="var(--ag-brand)" inline />
              </div>
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--ag-muted)" }}>
                {getGameSeo("anyguessr").description}
              </p>
            </div>
            <Divider color="var(--ag-border)" />
            {/* Visual */}
            <div className={cardVisualClass} style={cardVisualSection}>
              <AnyGuessrVisual />
            </div>
            <Divider color="var(--ag-border)" />
            {/* CTA */}
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ag-brand)" }}>
                Guess today&apos;s countries &#8594;
              </span>
            </div>
          </GameCard>

          {/* Hot Takes */}
          <GameCard
            href="/hot-takes"
            bg="var(--ht-surface)"
            border="color-mix(in srgb, var(--ht-accent) 65%, transparent)"
          >
            {/* Title */}
            <div className={cardTitleClass} style={cardTitleSection}>
              <GameTitle
                game="hot-takes"
                as="h2"
                style={{
                  fontSize: "28px",
                  fontWeight: 900,
                  fontStyle: "italic",
                  lineHeight: 1,
                  color: "var(--ht-text)",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              />
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--ht-text-dim)" }}>
                {getGameSeo("hot-takes").description}
              </p>
            </div>
            <Divider color="var(--ht-line)" />
            {/* Visual */}
            <div className={cardVisualClass} style={cardVisualSection}>
              <HotTakesHomeVisual />
            </div>
            <Divider color="var(--ht-line)" />
            {/* CTA */}
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ht-accent)" }}>
                Rank today&apos;s list &#8594;
              </span>
            </div>
          </GameCard>

          {/* FreezeFrames */}
          <GameCard
            href="/freezeframes/daily"
            bg="var(--ff-surface)"
            border="color-mix(in srgb, var(--ff-purple-light) 65%, transparent)"
          >
            {/* Title */}
            <div className={cardTitleClass} style={cardTitleSection}>
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
                    fontSize: "28px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--ff-text)",
                    margin: 0,
                    letterSpacing: "-0.04em",
                  }}
                />
                <GameCardStreak gameId="freezeframes" accentColor="var(--ff-purple-light)" inline />
              </div>
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--ff-muted)" }}>
                {getGameSeo("freezeframes").description}
              </p>
            </div>
            <Divider color="var(--ff-border)" />
            {/* Visual */}
            <div className={cardVisualClass} style={cardVisualSection}>
              <FreezeFramesVisual />
            </div>
            <Divider color="var(--ff-border)" />
            {/* CTA */}
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--ff-purple-light)" }}>
                Play the four rounds &#8594;
              </span>
            </div>
          </GameCard>

          {/* Ball Knowledge */}
          <GameCard
            href="/ball-knowledge/daily"
            bg="var(--bk-backboard)"
            border="color-mix(in srgb, var(--bk-net-blue) 65%, transparent)"
          >
            {/* Title */}
            <div className={cardTitleClass} style={cardTitleSection}>
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
                    fontSize: "28px",
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
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--bk-chalk-dim)" }}>
                {getGameSeo("ball-knowledge").description}
              </p>
            </div>
            <Divider color="var(--bk-line)" />
            {/* Visual */}
            <div className={cardVisualClass} style={cardVisualSection}>
              <BallKnowledgeVisual />
            </div>
            <Divider color="var(--bk-line)" />
            {/* CTA */}
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--bk-net-blue)" }}>
                Start the clock &#8594;
              </span>
            </div>
          </GameCard>

          {/* Getting Warmer */}
          <GameCard
            href="/getting-warmer/daily"
            bg="var(--gw-surface)"
            border="color-mix(in srgb, var(--gw-orange) 65%, transparent)"
          >
            <div className={cardTitleClass} style={cardTitleSection}>
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
                    fontSize: "28px",
                    fontWeight: 400,
                    lineHeight: 1,
                    color: "var(--gw-ink)",
                    margin: 0,
                    letterSpacing: "0.03em",
                    minWidth: 0,
                  }}
                />
                <GameCardStreak gameId="getting-warmer" accentColor="var(--gw-orange)" inline />
              </div>
              <p className={cardDescClass} style={{ ...cardDescription, color: "var(--gw-ink-dim)" }}>
                {getGameSeo("getting-warmer").description}
              </p>
            </div>
            <Divider color="color-mix(in srgb, var(--gw-orange) 28%, transparent)" />
            <div className={cardVisualClass} style={cardVisualSection}>
              <GettingWarmerVisual />
            </div>
            <Divider color="color-mix(in srgb, var(--gw-orange) 28%, transparent)" />
            <div className={cardActionClass} style={cardActionSection}>
              <span className="stim-text-link" style={{ ...cta, color: "var(--gw-orange)" }}>
                Reveal the clues &#8594;
              </span>
            </div>
          </GameCard>
          </div>
        </section>

        {/* ── PLAY TOGETHER ─────────────────────────────────────────── */}
        <section className="stim-home-section" style={{ marginBottom: "36px" }}>
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
                className="stim-hero-card stim-party-card stim-game-card"
                style={{
                  background: "var(--panel)",
                  border: "1.5px solid color-mix(in srgb, var(--gold) 65%, transparent)",
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
                  className="stim-party-title"
                  style={{ padding: "28px 28px 16px", position: "relative" }}
                >
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "clamp(28px, 5vw, 36px)",
                      fontWeight: 900,
                      lineHeight: 0.95,
                      color: "var(--text)",
                      margin: "0 0 10px",
                    }}
                  >
                    Draft{" "}
                    <em
                      style={{
                        fontStyle: "italic",
                        color: "var(--gold-hi)",
                      }}
                    >
                      Anything
                    </em>
                  </h2>
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
                <div className={partyVisualClass} style={partyVisualSection}>
                  <DraftAnythingVisual />
                </div>
                <div className={partyActionClass} style={partyActionSection}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 0",
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
                className="stim-hero-card stim-party-card stim-game-card"
                style={{
                  background: "var(--ss-surface)",
                  border: "1.5px solid color-mix(in srgb, var(--ss-lime) 65%, transparent)",
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
                  className="stim-party-title"
                  style={{ padding: "28px 28px 16px", position: "relative" }}
                >
                  <GameTitle
                    game="slippery-slope"
                    as="h2"
                    style={{
                      fontSize: "clamp(26px, 4.5vw, 32px)",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--ss-text)",
                      margin: "0 0 10px",
                    }}
                  />
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
                <div className={partyVisualClass} style={partyVisualSection}>
                  <SlipperySlopeVisual />
                </div>
                <div className={partyActionClass} style={partyActionSection}>
                  <span
                    className="stim-text-link"
                    style={{
                      ...cta,
                      color: "var(--ss-lime)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 0",
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
                    background: "var(--panel-alt)",
                    border: "1px solid var(--border-hi)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-dim)",
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
