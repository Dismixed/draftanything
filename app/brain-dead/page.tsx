"use client";

import Link from "next/link";

export default function BrainDeadPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bd-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 64px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--bd-text)",
              margin: "0 0 4px",
              letterSpacing: "-0.5px",
            }}
          >
            Brain Dead
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "var(--bd-text-muted)",
              margin: 0,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Trivia Challenge
          </p>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <Link href="/brain-dead/daily" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--bd-surface)",
                border: "1px solid var(--bd-border)",
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
                e.currentTarget.style.borderColor = "var(--bd-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--bd-border)";
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
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bd-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--bd-text)", marginBottom: "2px" }}>
                Daily Challenge
              </div>
              <div style={{ fontSize: "10px", color: "var(--bd-text-muted)" }}>
                15 questions. Same for everyone. One shot.
              </div>
            </div>
          </Link>

          <Link href="/brain-dead/freeplay" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--bd-surface)",
                border: "1px solid var(--bd-border)",
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
                e.currentTarget.style.borderColor = "var(--bd-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--bd-border)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "var(--bd-secondary)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bd-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--bd-text)", marginBottom: "2px" }}>
                Free Play
              </div>
              <div style={{ fontSize: "10px", color: "var(--bd-text-muted)" }}>
                Pick your category. Play as many times as you want.
              </div>
            </div>
          </Link>

          <Link href="/brain-dead/leaderboard" style={{ textDecoration: "none", display: "block" }}>
            <div
              style={{
                background: "var(--bd-surface)",
                border: "1px solid var(--bd-border)",
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
                e.currentTarget.style.borderColor = "var(--bd-success)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "var(--bd-border)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "var(--bd-success)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bd-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--bd-text)", marginBottom: "2px" }}>
                Leaderboard
              </div>
              <div style={{ fontSize: "10px", color: "var(--bd-text-muted)" }}>
                See how you stack up against today&apos;s players.
              </div>
            </div>
          </Link>
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "var(--bd-surface)",
            borderRadius: "8px",
            border: "1px solid var(--bd-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "10px",
              color: "var(--bd-text-muted)",
            }}
          >
            <span>
              Best:{" "}
              <span style={{ color: "var(--bd-primary)", fontWeight: 600 }}>
                1,340
              </span>
            </span>
            <span>
              Games:{" "}
              <span style={{ color: "var(--bd-secondary)", fontWeight: 600 }}>
                23
              </span>
            </span>
            <span>
              Streak:{" "}
              <span style={{ color: "var(--bd-success)", fontWeight: 600 }}>
                5 days
              </span>
            </span>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "var(--bd-text-muted)",
            marginTop: "48px",
            opacity: 0.6,
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
