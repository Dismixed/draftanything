"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_GAMES } from "@/lib/admin/games";

export default function AdminHubPage() {
  const [needsReview, setNeedsReview] = useState(0);

  useEffect(() => {
    // The card links either way; the count is a nudge, so errors are ignored.
    fetch("/api/admin/daily-review")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setNeedsReview(data?.summary?.total ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#121213",
        color: "#e8e8e8",
        padding: "32px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <header style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", color: "#787c7e", margin: "0 0 8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Stim Labs
          </p>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Admin</h1>
          <p style={{ color: "#9aa0a6", margin: 0, fontSize: "14px", lineHeight: 1.5 }}>
            Puzzle authoring, scheduling, and content review. Pick a game to manage its admin tools.
          </p>
        </header>

        <Link
          href="/admin/review"
          style={{
            display: "block",
            padding: "16px 18px",
            borderRadius: "10px",
            border: "1px solid #ff6b1a",
            background: "#1c1c1e",
            color: "#e8e8e8",
            textDecoration: "none",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff6b1a", flexShrink: 0 }}
              aria-hidden
            />
            <strong style={{ fontSize: "16px" }}>Review dailies</strong>
            {needsReview > 0 && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#ff6b1a",
                  border: "1px solid #ff6b1a",
                  borderRadius: "4px",
                  padding: "2px 6px",
                }}
              >
                {needsReview} need review
              </span>
            )}
          </div>
          <p style={{ fontSize: "13px", color: "#9aa0a6", margin: 0, lineHeight: 1.45 }}>
            Approve or swap the next 10 days of dailies before they go live.
          </p>
        </Link>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ADMIN_GAMES.map((game) => {
            const inner = (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: game.accent,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <strong style={{ fontSize: "16px" }}>{game.name}</strong>
                  {!game.adminHref && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#787c7e",
                        border: "1px solid #3a3a3c",
                        borderRadius: "4px",
                        padding: "2px 6px",
                      }}
                    >
                      Soon
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "#9aa0a6", margin: 0, lineHeight: 1.45 }}>
                  {game.description}
                </p>
              </>
            );

            const cardStyle = {
              display: "block" as const,
              padding: "16px 18px",
              borderRadius: "10px",
              border: "1px solid #3a3a3c",
              background: "#1c1c1e",
              color: "#e8e8e8",
              textDecoration: "none" as const,
              opacity: game.adminHref ? 1 : 0.72,
              cursor: game.adminHref ? "pointer" : "default",
            };

            if (game.adminHref) {
              return (
                <Link key={game.id} href={game.adminHref} style={cardStyle}>
                  {inner}
                </Link>
              );
            }

            return (
              <div key={game.id} style={cardStyle} aria-disabled>
                {inner}
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: "28px", fontSize: "12px", color: "#787c7e" }}>
          Access is limited to emails in <code style={{ color: "#9aa0a6" }}>ADMIN_EMAILS</code>.
        </p>
      </div>
    </div>
  );
}
