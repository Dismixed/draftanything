import Link from "next/link";

export default function NotFound() {
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
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              margin: "0 0 8px",
              color: "var(--text-dim)",
              opacity: 0.45,
              lineHeight: 1,
            }}
          >
            404
          </h1>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px", color: "var(--text)" }}>
            Page not found
          </h2>
          <p style={{ color: "var(--text-dim)", fontSize: 14, margin: "0 0 20px" }}>
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link href="/" className="btn-gold" style={{ display: "inline-block", padding: "10px 18px" }}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
