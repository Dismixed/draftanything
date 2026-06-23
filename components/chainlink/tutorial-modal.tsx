"use client";

import { useState } from "react";
import { isTutorialSeen, markTutorialSeen } from "@/lib/chainlink/store";

export default function TutorialModal() {
  const [visible, setVisible] = useState(() => !isTutorialSeen());

  const handleDismiss = () => {
    markTutorialSeen();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(7,9,15,0.85)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--panel)",
          border: "1px solid var(--border-hi)",
          padding: "32px 28px 28px",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Gold hairline */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "15%",
            right: "15%",
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: "inline-block", marginBottom: "8px" }}
          >
            <circle cx="12" cy="6" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
            <circle cx="12" cy="18" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
            <rect x="11" y="9" width="2" height="6" rx="1" fill="#c9a84c" opacity="0.5" />
          </svg>
          <h2
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--text)",
              margin: 0,
            }}
          >
            How to Play
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--gold-hi)",
                flexShrink: 0,
              }}
            >
              1
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                Category Guessing
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                All 5 words share a common category. You see only the first letter of each
                word — type the full word to reveal it and continue.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--gold-hi)",
                flexShrink: 0,
              }}
            >
              2
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                Guess One at a Time
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                You see only the first letter of each word. Type the full word to reveal it and
                unlock the next link in the chain.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--gold-hi)",
                flexShrink: 0,
              }}
            >
              3
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                Bonus Theme Round
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                Solve all 5 words, then guess the shared category for{" "}
                <strong style={{ color: "var(--gold)" }}>+200 bonus points</strong>.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(201,168,76,0.12)",
                border: "1px solid rgba(201,168,76,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--gold-hi)",
                flexShrink: 0,
              }}
            >
              4
            </div>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "4px",
                }}
              >
                Stuck? Use a Hint
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                Each hint reveals one letter of the current word (<strong style={{ color: "#ff6b6b" }}>-25 pts</strong>).
                You get 3 hints per puzzle.
              </p>
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleDismiss}
          className="btn-gold"
          style={{ marginTop: "28px", padding: "14px" }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
