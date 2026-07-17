"use client";

import { useEffect, useState } from "react";
import { isTutorialSeen, markTutorialSeen } from "@/lib/chainlink/store";

export default function TutorialModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isTutorialSeen());
  }, []);

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
          background: "rgba(18,18,19,0.9)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "var(--cl-card)",
            border: "2px solid var(--cl-border)",
            borderRadius: "6px",
            padding: "32px 28px 28px",
            position: "relative",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              style={{ display: "inline-block", marginBottom: "8px" }}
            >
              <circle cx="12" cy="6" r="4" stroke="var(--cl-text)" strokeWidth="2" fill="none" />
              <circle cx="12" cy="18" r="4" stroke="var(--cl-text)" strokeWidth="2" fill="none" />
              <rect x="11" y="9" width="2" height="6" rx="1" fill="var(--cl-text)" />
            </svg>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--cl-text)",
                margin: 0,
              }}
            >
              How to Play
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--cl-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--cl-text)",
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
                    color: "var(--cl-text)",
                    marginBottom: "4px",
                  }}
                >
                  Build the Chain
                </div>
                <p style={{ fontSize: "12px", color: "var(--cl-gray-dim)", margin: 0, lineHeight: 1.6 }}>
                  Each word pairs with the one before it to form a common phrase — like{" "}
                  <strong style={{ color: "var(--cl-yellow)" }}>apple juice</strong>, then{" "}
                  <strong style={{ color: "var(--cl-yellow)" }}>juice box</strong>.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--cl-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--cl-text)",
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
                    color: "var(--cl-text)",
                    marginBottom: "4px",
                  }}
                >
                  Start With the First Word
                </div>
                <p style={{ fontSize: "12px", color: "var(--cl-gray-dim)", margin: 0, lineHeight: 1.6 }}>
                  The first word is given to you. Guess each next word one at a time — you only see
                  the first letter until you solve it.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--cl-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--cl-text)",
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
                    color: "var(--cl-text)",
                    marginBottom: "4px",
                  }}
                >
                  Stuck? Wrong Guesses Help
                </div>
                <p style={{ fontSize: "12px", color: "var(--cl-gray-dim)", margin: 0, lineHeight: 1.6 }}>
                  Each wrong guess reveals one letter of the current word. You can be wrong three
                  times — wrong a fourth time and you lose.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            style={{
              marginTop: "28px",
              padding: "14px",
              width: "100%",
              background: "var(--cl-green)",
                  color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Got it!
          </button>
        </div>
      </div>
  );
}
