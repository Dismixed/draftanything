"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection } from "@/features/draft/types";
import { buildPublicResult } from "@/features/results/build-public-result";
import { ResultsBody } from "@/components/results/results-body";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface CompletePanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function CompletePanel({ projection, myPlayerId }: CompletePanelProps) {
  const router = useRouter();
  const { draft, judgment } = projection;
  const result = useMemo(() => buildPublicResult(projection), [projection]);
  const isHost = draft.hostPlayerId === myPlayerId;

  const [rematchLoading, setRematchLoading] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleRematch() {
    if (rematchLoading) return;
    setRematchLoading(true);
    setRematchError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/rematch`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setRematchError(data.message ?? "Failed to start rematch");
        return;
      }
      router.refresh();
    } catch {
      setRematchError("Network error. Please try again.");
    } finally {
      setRematchLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(5, 7, 18, 0.88)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="panel-card"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "min(92vh, 900px)",
          overflow: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <header>
          <p
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 6px 0",
            }}
          >
            Draft Complete
          </p>
          <h2
            id="complete-modal-title"
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: "italic",
              fontSize: "24px",
              color: "var(--text)",
              margin: 0,
            }}
          >
            {result.topic}
          </h2>
        </header>

        {judgment ? (
          <ResultsBody
            result={result}
            draftId={draft.id}
          />
        ) : (
          <p style={{ color: "var(--text-dim)", fontSize: "13px", margin: 0 }}>
            The draft is complete. Results are being processed.
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            alignItems: "center",
            borderTop: "1px solid var(--border-hi)",
            paddingTop: "16px",
          }}
        >
          {isHost ? (
            <>
              <button
                type="button"
                onClick={handleRematch}
                disabled={rematchLoading}
                className="btn-gold"
                style={{ borderColor: "rgba(0,229,255,0.4)", color: "var(--cyan)" }}
              >
                <ButtonLoadingLabel
                  loading={rematchLoading}
                  label="— Rematch —"
                  loadingLabel="Resetting..."
                />
              </button>
              {rematchError && (
                <p role="alert" style={{ color: "#ff4d4d", fontSize: "12px", margin: 0 }}>
                  {rematchError}
                </p>
              )}
            </>
          ) : (
            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-dim)" }}>
              Waiting for the host to start a rematch…
            </p>
          )}
          <Link
            href="/"
            className="btn-ghost"
            style={{ textDecoration: "none", width: "auto", padding: "10px 16px" }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
