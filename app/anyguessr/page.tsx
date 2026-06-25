"use client";

import Link from "next/link";
import { GameBackLink } from "@/components/ui/game-back-link";

export default function AnyGuessrPage() {
  return (
    <main
      className="ag-game-page"
      style={{
        minHeight: "100vh",
        background: "var(--ag-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(224,168,88,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 35% at 80% 85%, rgba(124,58,255,0.06) 0%, transparent 55%)",
        }}
      />
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <header style={{ position: "relative", marginBottom: "32px" }}>
          <GameBackLink color="var(--ag-muted)" />
          <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(26px, 5.5vw, 34px)",
              fontWeight: 800,
              color: "var(--ag-text)",
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            AnyGuessr
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "var(--ag-muted)",
              margin: 0,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Guess the country from cultural clues
          </p>
          </div>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href="/anyguessr/daily" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--ag-surface)",
                border: "1px solid var(--ag-border)",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "var(--ag-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--ag-border)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "var(--ag-accent)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ag-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ag-text)", marginBottom: "2px" }}>
                Today&apos;s Puzzle
              </div>
              <div style={{ fontSize: "10px", color: "var(--ag-muted)" }}>
                Five rounds. Closer guesses score more. Same country for everyone.
              </div>
            </div>
          </Link>

          <Link href="/anyguessr/infinite" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--ag-surface)",
                border: "1px solid var(--ag-border)",
                borderRadius: "10px",
                padding: "16px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = "rgba(124,58,255,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--ag-border)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "rgba(124,58,255,0.8)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ag-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ag-text)", marginBottom: "2px" }}>
                Infinite
              </div>
              <div style={{ fontSize: "10px", color: "var(--ag-muted)" }}>
                Random countries, round after round. No daily limit.
              </div>
            </div>
          </Link>
        </div>

      </div>
    </main>
  );
}
