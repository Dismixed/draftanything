"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

const DAY_MS = 24 * 60 * 60 * 1000;
const LS_KEY = "lastAccountPrompt";

interface AccountPromptProps {
  onDismiss?: () => void;
}

export function AccountPrompt({ onDismiss }: AccountPromptProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) return;

      const last = localStorage.getItem(LS_KEY);
      if (last && Date.now() - Number(last) < DAY_MS) return;

      setOpen(true);
    });
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(LS_KEY, Date.now().toString());
    setOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleCreateAccount = useCallback(() => {
    router.push("/auth");
  }, [router]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0,0,0,0.6)",
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border-hi)",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "340px",
          width: "100%",
          textAlign: "center",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <h3
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          Save your progress?
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-dim)",
            lineHeight: 1.5,
            margin: "0 0 20px",
          }}
        >
          Create an account to keep your stats and appear on the leaderboard.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            type="button"
            onClick={handleCreateAccount}
            style={{
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.42)",
              color: "var(--gold)",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "12px 16px",
              borderRadius: "8px",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.7)";
              e.currentTarget.style.color = "var(--gold-hi)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.42)";
              e.currentTarget.style.color = "var(--gold)";
            }}
          >
            Create account →
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "1px solid var(--border-hi)",
              color: "var(--text-dim)",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              fontSize: "11px",
              cursor: "pointer",
              padding: "10px 16px",
              borderRadius: "8px",
              letterSpacing: "0.04em",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(201,168,76,0.42)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hi)";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
