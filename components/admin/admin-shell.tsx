"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({
  title,
  subtitle,
  children,
  maxWidth = 1200,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#121213",
        color: "#ffffff",
        padding: "32px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth, margin: "0 auto" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px" }}>
          <Link
            href="/admin"
            style={{ color: "#9aa0a6", textDecoration: "none" }}
          >
            ← Admin
          </Link>
        </nav>
        <header style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px" }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: "13px", color: "#787c7e", margin: 0 }}>{subtitle}</p>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}
