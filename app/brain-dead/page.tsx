import Link from "next/link";

const ACCENT = "#ff3c3c";

export default function BrainDeadPage() {
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(255,60,60,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 30% at 80% 90%, rgba(124,58,255,0.04) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "540px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              opacity: 0.7,
              marginBottom: "10px",
            }}
          >
            Stim Games Presents
          </div>
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "clamp(36px, 8vw, 52px)",
              fontWeight: 900,
              color: "var(--text)",
              margin: "0 0 12px",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            Brain{" "}
            <em style={{ fontStyle: "italic", color: ACCENT }}>Dead</em>
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-dim)",
              margin: 0,
              lineHeight: 1.6,
              fontWeight: 300,
              maxWidth: "400px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Answer until you can&apos;t. Get it wrong once — it&apos;s over.
            Questions get harder the deeper you go.
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link href="/brain-dead/daily" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,60,60,0.1) 0%, rgba(124,58,255,0.06) 100%)",
                border: "1px solid rgba(255,60,60,0.28)",
                padding: "28px 24px",
                position: "relative",
                cursor: "pointer",
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
              className="stim-hero-card"
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "12%",
                  right: "12%",
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,60,60,0.5), transparent)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(255,60,60,0.1)",
                    border: "1px solid rgba(255,60,60,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  &#9716;
                </div>
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 4px",
                    }}
                  >
                    Daily Challenge
                  </h2>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-dim)",
                      margin: 0,
                      lineHeight: 1.5,
                      fontWeight: 300,
                    }}
                  >
                    One run per day. Same questions for everyone. Climb the board.
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: ACCENT,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Play &#8594;
                </div>
              </div>
            </div>
          </Link>

          <Link href="/brain-dead/freeplay" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,255,0.08) 0%, rgba(255,60,60,0.04) 100%)",
                border: "1px solid rgba(124,58,255,0.22)",
                padding: "28px 24px",
                position: "relative",
                cursor: "pointer",
                transition: "border-color 0.25s, box-shadow 0.25s",
              }}
              className="stim-hero-card"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(124,58,255,0.1)",
                    border: "1px solid rgba(124,58,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  &#127922;
                </div>
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 4px",
                    }}
                  >
                    Free Play
                  </h2>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-dim)",
                      margin: 0,
                      lineHeight: 1.5,
                      fontWeight: 300,
                    }}
                  >
                    Pick a category. Play as much as you want. No limits.
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--purple)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Play &#8594;
                </div>
              </div>
            </div>
          </Link>

          <Link href="/brain-dead/leaderboard" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--panel)",
                border: "1px solid var(--border-hi)",
                padding: "20px 24px",
                cursor: "pointer",
                transition: "border-color 0.25s",
              }}
              className="stim-hero-card"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: 0,
                    }}
                  >
                    Leaderboard
                  </h2>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    whiteSpace: "nowrap",
                  }}
                >
                  View &#8594;
                </div>
              </div>
            </div>
          </Link>
        </div>

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
          &larr;{" "}
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Back to Stim Games
          </Link>
        </p>
      </div>
    </main>
  );
}
