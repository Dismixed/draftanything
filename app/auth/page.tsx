"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SHOW_AUTH_UI } from "@/lib/auth/config";

type Tab = "sign-in" | "sign-up";

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 16px",
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "'Outfit', sans-serif",
  border: "none",
  background: active ? "var(--panel)" : "transparent",
  color: active ? "var(--text)" : "var(--text-dim)",
  cursor: "pointer",
  borderBottom: active ? "2px solid var(--purple)" : "2px solid transparent",
  transition: "color 0.15s, background 0.15s, border-color 0.15s",
});

function AuthPageInner() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sign-in");

  useEffect(() => {
    if (!SHOW_AUTH_UI) {
      router.replace("/");
    }
  }, [router]);

  if (!SHOW_AUTH_UI) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(28px, 6vw, 36px)",
              fontWeight: 900,
              lineHeight: 1,
              color: "var(--text)",
              margin: "0 0 8px",
            }}
          >
            Stim{" "}
            <em
              style={{
                fontStyle: "italic",
                color: "var(--gold-hi)",
              }}
            >
              Labs
            </em>
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-dim)",
              margin: 0,
              fontWeight: 300,
            }}
          >
            Sign in to your account
          </p>
        </div>

        <div
          style={{
            display: "flex",
            marginBottom: "0",
          }}
        >
          <button
            onClick={() => setTab("sign-in")}
            style={tabStyle(tab === "sign-in")}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab("sign-up")}
            style={tabStyle(tab === "sign-up")}
          >
            Sign Up
          </button>
        </div>

        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: "0 0 8px 8px",
            padding: "24px",
            borderTop: "none",
          }}
        >
          {tab === "sign-in" ? <SignInForm /> : <SignUpForm />}
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  );
}
