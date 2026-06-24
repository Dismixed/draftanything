import Link from "next/link";

export default function ChainlinkSelectPage() {
  return (
    <main
      className="game-page"
      style={{
        minHeight: "100vh",
        background: "#121213",
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
            <circle cx="12" cy="6" r="4" stroke="#ffffff" strokeWidth="2" fill="none" />
            <circle cx="12" cy="18" r="4" stroke="#ffffff" strokeWidth="2" fill="none" />
            <rect x="11" y="9" width="2" height="6" rx="1" fill="#ffffff" />
          </svg>
          <h1
            style={{
              fontSize: "clamp(32px, 7vw, 44px)",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Chainlink
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "#787c7e",
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

        {/* Daily Puzzle CTA */}
        <Link href="/chainlink/daily" style={{ textDecoration: "none", display: "block" }}>
          <div
            style={{
              background: "#1a1a1b",
              border: "2px solid #6aaa64",
              borderRadius: "6px",
              padding: "28px 24px",
              position: "relative",
              cursor: "pointer",
              transition: "border-color 0.25s, box-shadow 0.25s",
            }}
            className="stim-hero-card"
          >
            <div className="stim-mode-card-row">
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "6px",
                  background: "#6aaa64",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                  color: "#ffffff",
                }}
              >
                &#9716;
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#ffffff",
                    margin: "0 0 4px",
                  }}
                >
                  Daily Puzzle
                </h2>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#787c7e",
                    margin: 0,
                    lineHeight: 1.5,
                    fontWeight: 300,
                  }}
                >
                  One puzzle per day. Guess the word chain — each word pairs with the one before it.
                </p>
              </div>
              <div
                className="stim-mode-card-cta"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#6aaa64",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                Play &#8594;
              </div>
            </div>
          </div>
        </Link>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#787c7e",
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
