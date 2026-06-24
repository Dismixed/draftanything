"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/browser";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: "12px",
  background: "var(--panel-alt)",
  border: "1px solid var(--border-hi)",
  borderRadius: "6px",
  color: "var(--text)",
  fontSize: "14px",
  outline: "none",
  fontFamily: "'Outfit', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--purple)",
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "'Outfit', sans-serif",
  cursor: "pointer",
};

const btnGoogle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "transparent",
  border: "1px solid var(--border-hi)",
  borderRadius: "6px",
  color: "var(--text)",
  fontSize: "13px",
  fontWeight: 600,
  fontFamily: "'Outfit', sans-serif",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

function getGuestToken(): string | undefined {
  return document.cookie
    .split("; ")
    .find((r) => r.startsWith("guest_token="))
    ?.split("=")[1];
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    await fetch("/api/auth/merge", { method: "POST" }).catch(() => {});
    router.push(redirect);
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const guestToken = getGuestToken();
    const redirectTo = `${window.location.origin}/auth/callback${guestToken ? `?guest_token=${guestToken}` : ""}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEmailSignUp}>
      <input
        type="text"
        required
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name"
        style={inputStyle}
      />

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={inputStyle}
      />

      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={inputStyle}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          ...btnPrimary,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Creating account..." : "Sign up"}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "16px 0",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--border-hi)" }} />
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "var(--border-hi)" }} />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        style={{
          ...btnGoogle,
          opacity: loading ? 0.7 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Sign up with Google
      </button>

      {error && (
        <p
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#ff6b6b",
          }}
        >
          {error}
        </p>
      )}
    </form>
  );
}
