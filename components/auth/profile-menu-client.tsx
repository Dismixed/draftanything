"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";

type ProfileMenuClientProps = {
  variant: "signed-out" | "signed-in";
  displayName?: string;
  avatarUrl?: string | null;
  email?: string;
};

export function ProfileMenuClient({ variant, displayName, avatarUrl }: ProfileMenuClientProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (variant === "signed-out") {
    return (
      <Link
        href={`/auth?redirect=${encodeURIComponent(pathname)}`}
        style={{
          color: "var(--text-dim)",
          fontSize: "12px",
          fontWeight: 500,
          textDecoration: "none",
          fontFamily: "'Outfit', sans-serif",
          letterSpacing: "0.04em",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
      >
        Sign in
      </Link>
    );
  }

  const initial = displayName?.charAt(0).toUpperCase() || "?";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1px solid var(--border-hi)",
          background: avatarUrl ? "transparent" : "var(--panel-alt)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 0,
          color: "var(--text-dim)",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(201,168,76,0.45)";
          if (!avatarUrl) e.currentTarget.style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hi)";
          if (!avatarUrl) e.currentTarget.style.color = "var(--text-dim)";
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: "8px",
            minWidth: 160,
            padding: "4px 0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text)",
              fontFamily: "'Outfit', sans-serif",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {displayName}
          </div>
          <Link
            href="/chainlink/stats"
            style={{
              display: "block",
              padding: "8px 12px",
              fontSize: "12px",
              color: "var(--text-dim)",
              textDecoration: "none",
              fontFamily: "'Outfit', sans-serif",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.background = "rgba(124,58,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            My Stats
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 12px",
              fontSize: "12px",
              color: "var(--text-dim)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Outfit', sans-serif",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.background = "rgba(124,58,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
