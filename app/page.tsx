import Image from "next/image";
import Link from "next/link";
import { SoundToggle } from "@/components/ui/sound-toggle";

const GAMES = [
  {
    name: "Frames",
    description:
      "See a single frame from a movie, show, or book — guess what it's from.",
    icon: "▣",
    status: "coming-soon" as const,
  },
  {
    name: "Would You Rather",
    description: "Pick a side. Defend your choice.",
    icon: "VS",
    status: "coming-soon" as const,
  },
  {
    name: "AnyGuessr",
    description:
      "Guess anything from a clue — food, language, place, and more.",
    icon: "?",
    status: "coming-soon" as const,
  },
  {
    name: "Scattergories",
    description: "A letter, a timer, twelve categories. Unique answers win.",
    icon: "A",
    status: "coming-soon" as const,
  },
];

const modeHintStyle = {
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  color: "var(--text-dim)",
  opacity: 0.75,
  margin: "0 0 10px",
} as const;

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
        padding: "48px 24px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
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
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 2,
          }}
        >
          <SoundToggle />
        </div>
        {/* Header */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "48px",
          }}
        >
          <Image
            src="/stimlabs_badge_v5.svg"
            alt="Stim Labs"
            width={108}
            height={124}
            priority
            unoptimized
            style={{
              width: "clamp(80px, 20vw, 108px)",
              height: "auto",
              margin: "0 auto 16px",
              display: "block",
            }}
          />
          <div
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "var(--gold)",
              opacity: 0.7,
              marginBottom: "10px",
            }}
          >
            Party games for any crowd
          </div>
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "clamp(36px, 8vw, 52px)",
              fontWeight: 900,
              lineHeight: 1,
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
                textShadow: "0 0 40px rgba(240,200,96,0.2)",
              }}
            >
              Games
            </em>
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              width: "100%",
              maxWidth: "200px",
              margin: "14px auto 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, var(--border-hi))",
              }}
            />
            <span
              style={{ color: "var(--gold)", fontSize: "7px", opacity: 0.45 }}
            >
              &#9670;
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                background:
                  "linear-gradient(90deg, var(--border-hi), transparent)",
              }}
            />
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-dim)",
              lineHeight: 1.65,
              margin: "18px auto 0",
              fontWeight: 300,
              maxWidth: "420px",
            }}
          >
            Draft with friends, solve the daily word puzzle, or see how long your
            trivia run lasts.
          </p>
        </header>

        {/* Draft Anything — Hero Card */}
        <Link
          href="/draft-anything"
          style={{
            display: "block",
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(124,58,255,0.08) 100%)",
              border: "1px solid rgba(201,168,76,0.28)",
              padding: "40px 36px",
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
            className="stim-hero-card"
          >
            {/* Top gold hairline */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "10%",
                right: "10%",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
              }}
            />

            {/* Glow blob */}
            <div
              style={{
                position: "absolute",
                top: "-40%",
                right: "-10%",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "220px" }}>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    opacity: 0.8,
                    marginBottom: "8px",
                  }}
                >
                  Party Game
                </div>
                <h2
                  style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: "clamp(32px, 6vw, 44px)",
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
                <p style={{ ...modeHintStyle, margin: "0 0 10px" }}>
                  Multiplayer · 2+ players
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-dim)",
                    lineHeight: 1.6,
                    margin: 0,
                    fontWeight: 300,
                    maxWidth: "380px",
                  }}
                >
                  Assemble your roster. Defend every pick. Let the jury decide
                  who built the best lineup.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  padding: "12px 24px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-hi)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Play Now
                <span style={{ fontSize: "14px" }}>&#8594;</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Chainlink & Brain Dead — Side by side */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              flex: "1 1 280px",
              display: "block",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#1a1a1b",
                border: "2px solid #3a3a3c",
                borderRadius: "6px",
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.25s, box-shadow 0.25s",
                display: "flex",
                flexDirection: "column",
              }}
              className="stim-hero-card"
            >
              <Link
                href="/chainlink"
                aria-label="Chainlink — All modes"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                  borderRadius: "6px",
                }}
              />
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "#6aaa64",
                  opacity: 0.9,
                  marginBottom: "8px",
                }}
              >
                Word Game
              </div>
              <h2
                style={{
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 700,
                  lineHeight: 0.95,
                  color: "#ffffff",
                  margin: "0 0 6px",
                }}
              >
                Chainlink
              </h2>
              <p style={{ ...modeHintStyle, margin: "0 0 10px", color: "#787c7e" }}>
                Solo · Daily puzzle
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#787c7e",
                  lineHeight: 1.55,
                  margin: "0 0 20px",
                  fontWeight: 300,
                  flex: 1,
                }}
              >
                Link five words in a chain — each pairs with the one before it.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  className="stim-text-link"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#c9b458",
                  }}
                >
                  All modes
                  <span style={{ fontSize: "12px" }}>&#8594;</span>
                </span>
                <Link
                  href="/chainlink/daily"
                  className="stim-text-link"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#787c7e",
                    opacity: 0.85,
                  }}
                >
                  Today&apos;s puzzle
                  <span style={{ fontSize: "12px" }}>&#8594;</span>
                </Link>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: "1 1 280px",
              display: "block",
            }}
          >
            <div
              style={{
                height: "100%",
                background:
                  "linear-gradient(135deg, rgba(255,60,60,0.1) 0%, rgba(124,58,255,0.06) 100%)",
                border: "1px solid rgba(255,60,60,0.28)",
                padding: "28px 24px",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.25s, box-shadow 0.25s",
                display: "flex",
                flexDirection: "column",
              }}
              className="stim-hero-card"
            >
              <Link
                href="/brain-dead"
                aria-label="Brain Dead — All modes"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 1,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,60,60,0.5), transparent)",
                }}
              />
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "#ff6b6b",
                  opacity: 0.8,
                  marginBottom: "8px",
                }}
              >
                Trivia
              </div>
              <h2
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: "clamp(24px, 4vw, 32px)",
                  fontWeight: 900,
                  lineHeight: 0.95,
                  color: "var(--text)",
                  margin: "0 0 6px",
                }}
              >
                Brain{" "}
                <em
                  style={{
                    fontStyle: "italic",
                    color: "#ff3c3c",
                    textShadow: "0 0 30px rgba(255,60,60,0.15)",
                  }}
                >
                  Dead
                </em>
              </h2>
              <p style={{ ...modeHintStyle, margin: "0 0 10px" }}>
                Solo · Daily + freeplay
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  lineHeight: 1.55,
                  margin: "0 0 20px",
                  fontWeight: 300,
                  flex: 1,
                }}
              >
                Answer until you can&apos;t. One wrong answer ends the run.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span
                  className="stim-text-link"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#ff6b6b",
                  }}
                >
                  All modes
                  <span style={{ fontSize: "12px" }}>&#8594;</span>
                </span>
                <Link
                  href="/brain-dead/daily"
                  className="stim-text-link"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    opacity: 0.85,
                  }}
                >
                  Today&apos;s run
                  <span style={{ fontSize: "12px" }}>&#8594;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon section */}
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
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
            {GAMES.map((game) => (
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
                {/* Icon */}
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
                {/* Coming Soon badge */}
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
