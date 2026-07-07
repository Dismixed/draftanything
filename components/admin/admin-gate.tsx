"use client";

import { useEffect, useState } from "react";
import { AdminSignIn } from "@/components/admin/admin-sign-in";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/session");
        if (cancelled) return;
        setStatus(res.ok ? "authorized" : "unauthorized");
      } catch {
        if (!cancelled) setStatus("unauthorized");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#121213",
          color: "#9aa0a6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
        }}
      >
        Loading admin…
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div style={{ minHeight: "100vh", background: "#121213" }}>
        <AdminSignIn redirectPath="/admin" />
      </div>
    );
  }

  return <>{children}</>;
}
