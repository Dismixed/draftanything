"use client";

import type { ReactNode } from "react";

export interface HowItWorksRule {
  title: string;
  body: ReactNode;
}

export interface GameHowItWorksTheme {
  overlay?: string;
  surface: string;
  border: string;
  accent: string;
  text: string;
  textMuted: string;
  radius?: string;
}

interface GameHowItWorksModalProps {
  title?: string;
  subtitle?: string;
  rules: readonly HowItWorksRule[];
  buttonLabel?: string;
  onDismiss: () => void;
  theme: GameHowItWorksTheme;
}

export function GameHowItWorksModal({
  title = "How It Works",
  subtitle,
  rules,
  buttonLabel = "Got it!",
  onDismiss,
  theme,
}: GameHowItWorksModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: theme.overlay ?? "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="anim-fade-slide-up"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius ?? "12px",
          padding: "28px 24px 24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: theme.text,
              margin: subtitle ? "0 0 6px" : 0,
              letterSpacing: "-0.5px",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontSize: "11px",
                color: theme.textMuted,
                margin: 0,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {rules.map((rule, i) => (
            <div
              key={rule.title}
              style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${theme.accent} 15%, transparent)`,
                  border: `1px solid ${theme.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: theme.accent,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: theme.text,
                    marginBottom: "3px",
                  }}
                >
                  {rule.title}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: theme.textMuted,
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginTop: "24px",
            padding: "14px",
            width: "100%",
            background: theme.accent,
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            borderRadius: theme.radius === "6px" ? "6px" : "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.5px",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
