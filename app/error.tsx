"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: 12,
            padding: 32,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="btn-gold"
            style={{ padding: "10px 18px", marginBottom: 12 }}
          >
            Try again
          </button>
          <div>
            <Link href="/" style={{ color: "var(--gold)", fontSize: 13 }}>
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
