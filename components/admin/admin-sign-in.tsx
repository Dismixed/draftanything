"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export function AdminSignIn({ redirectPath = "/admin" }: { redirectPath?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your email for a sign-in link.");
  };

  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "48px auto",
        padding: "24px",
        background: "#1a1a1b",
        border: "1px solid #3a3a3c",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>
        Admin sign in
      </h2>
      <p style={{ fontSize: "12px", color: "#787c7e", margin: "0 0 20px" }}>
        Sign in with an email listed in ADMIN_EMAILS.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: "12px",
            background: "#0f0f10",
            border: "1px solid #3a3a3c",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "14px",
          }}
        />
        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "#6aaa64",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: status === "sending" || status === "sent" ? "not-allowed" : "pointer",
            opacity: status === "sending" || status === "sent" ? 0.7 : 1,
          }}
        >
          {status === "sending" ? "Sending..." : status === "sent" ? "Link sent" : "Send magic link"}
        </button>
      </form>

      {message && (
        <p
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: status === "error" ? "#ff6b6b" : "#6aaa64",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
