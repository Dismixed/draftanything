import Link from "next/link";

export default function ChainlinkSelectPage() {
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
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(124,58,255,0.06) 0%, transparent 55%), radial-gradient(ellipse 50% 30% at 20% 90%, rgba(201,168,76,0.04) 0%, transparent 50%)",
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
        {/* Header */}
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: "inline-block", marginBottom: "10px" }}
          >
            <circle cx="12" cy="6" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
            <circle cx="12" cy="18" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
            <rect x="11" y="9" width="2" height="6" rx="1" fill="#c9a84c" opacity="0.5" />
          </svg>
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "clamp(32px, 7vw, 44px)",
              fontWeight: 900,
              color: "var(--text)",
              margin: "0 0 8px",
              letterSpacing: "-0.01em",
            }}
          >
            Chainlink
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-dim)",
              margin: 0,
              lineHeight: 1.6,
              fontWeight: 300,
              maxWidth: "360px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Guess the word chain. Each word pairs with the one before it — like apple juice, then juice box.
          </p>
        </header>

        {/* Mode cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Daily Puzzle */}
          <Link href="/chainlink/daily" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(124,58,255,0.06) 100%)",
                border: "1px solid rgba(201,168,76,0.28)",
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
                  background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
                  pointerEvents: "none",
                }}
              />
              <div className="stim-mode-card-row">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  &#9716;
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 4px",
                    }}
                  >
                    Daily Puzzle
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
                    One puzzle per day. Share with friends. Same puzzle for everyone.
                  </p>
                </div>
                <div
                  className="stim-mode-card-cta"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Play &#8594;
                </div>
              </div>
            </div>
          </Link>

          {/* Unlimited Mode */}
          <Link href="/chainlink/unlimited" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(124,58,255,0.06) 100%)",
                border: "1px solid rgba(0,229,255,0.2)",
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
                  background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)",
                  pointerEvents: "none",
                }}
              />
              <div className="stim-mode-card-row">
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "rgba(0,229,255,0.08)",
                    border: "1px solid rgba(0,229,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                  }}
                >
                  &#8734;
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 4px",
                    }}
                  >
                    Unlimited Mode
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
                    Play as many puzzles as you want. Random chains, endless replay.
                  </p>
                </div>
                <div
                  className="stim-mode-card-cta"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--cyan)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  Play &#8594;
                </div>
              </div>
            </div>
          </Link>
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
          &larr;{" "}
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Back to Stim Games
          </Link>
        </p>
      </div>
    </main>
  );
}
