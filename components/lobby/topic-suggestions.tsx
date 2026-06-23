"use client";

import { useState, useEffect, useRef } from "react";
import { ButtonLoadingLabel, ButtonSpinner } from "@/components/ui/button-spinner";

interface TopicSuggestionsProps {
  onSelect: (topic: string) => void;
  initialInterests?: string;
}

export function TopicSuggestions({ onSelect, initialInterests }: TopicSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState(initialInterests ?? "");
  const [seenTopics, setSeenTopics] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  async function fetchTopics(interestOverride?: string) {
    setLoading(true);
    setError(null);

    const interestText = (interestOverride ?? interests).trim();

    try {
      await fetch("/api/guest", { method: "POST" });

      const res = await fetch("/api/ai/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: interestText || undefined,
          exclude: seenTopics.length > 0 ? seenTopics : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Something went wrong");
        return;
      }

      const newTopics: string[] = data.topics;
      setTopics(newTopics);
      setSeenTopics((prev) => [...prev, ...newTopics]);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    const nextInterests = interests || initialInterests || "";
    if (initialInterests && !interests) {
      setInterests(initialInterests);
    }
    setOpen(true);
    if (topics.length === 0) {
      fetchTopics(nextInterests);
    }
  }

  function select(topic: string) {
    onSelect(topic);
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="btn-ghost"
        style={{
          padding: "7px 14px",
          fontSize: "10px",
          width: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          borderColor: "rgba(201,168,76,0.3)",
          color: "var(--gold)",
        }}
        aria-label="Get AI topic suggestions"
      >
        {"\u2728"} Inspire me
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspire-modal-title"
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
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="panel-card"
            style={{
              width: "100%",
              maxWidth: "480px",
              maxHeight: "min(90vh, 600px)",
              overflow: "auto",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2
                id="inspire-modal-title"
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {"\u2728"} Get Inspired
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost"
                style={{
                  padding: "4px 8px",
                  fontSize: "14px",
                  width: "auto",
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                {"\u2715"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <label
                htmlFor="inspire-interests"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                }}
              >
                What are you into?
              </label>
              <input
                ref={inputRef}
                id="inspire-interests"
                type="text"
                placeholder="e.g. movies, cooking, 90s nostalgia, sports"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="da-input"
                style={{ fontSize: "13px" }}
                maxLength={200}
              />
              <button
                type="button"
                onClick={() => fetchTopics()}
                disabled={loading}
                className="btn-gold"
                style={{
                  fontSize: "12px",
                  padding: "8px 16px",
                }}
                aria-busy={loading}
              >
                <ButtonLoadingLabel
                  loading={loading}
                  label="Generate Ideas"
                  loadingLabel="Generating…"
                />
              </button>
            </div>

            {loading && topics.length === 0 && !error && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  padding: "24px 0",
                }}
              >
                <ButtonSpinner size={22} />
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-dim)",
                    margin: 0,
                    letterSpacing: "0.06em",
                  }}
                >
                  Generating ideas…
                </p>
              </div>
            )}

            {error && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "center",
                  padding: "12px 0",
                }}
              >
                <p style={{ fontSize: "12px", color: "#ff4d4d", margin: 0 }}>{error}</p>
                <button
                  type="button"
                  onClick={() => fetchTopics()}
                  className="btn-ghost"
                  style={{ padding: "6px 12px", fontSize: "10px", width: "auto" }}
                >
                  Try again
                </button>
              </div>
            )}

            {topics.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  position: "relative",
                  opacity: loading ? 0.55 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    margin: 0,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Pick a topic
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => select(topic)}
                      disabled={loading}
                      style={{
                        background: "rgba(201,168,76,0.08)",
                        border: "1px solid rgba(201,168,76,0.25)",
                        color: "var(--gold)",
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "12px",
                        padding: "6px 12px",
                        cursor: loading ? "wait" : "pointer",
                        borderRadius: "0",
                        transition:
                          "border-color 0.2s, background 0.2s, color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (loading) return;
                        e.currentTarget.style.borderColor =
                          "rgba(201,168,76,0.6)";
                        e.currentTarget.style.background =
                          "rgba(201,168,76,0.14)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(201,168,76,0.25)";
                        e.currentTarget.style.background =
                          "rgba(201,168,76,0.08)";
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fetchTopics()}
                  disabled={loading}
                  className="btn-ghost"
                  style={{
                    fontSize: "10px",
                    padding: "6px 12px",
                    width: "auto",
                    alignSelf: "flex-start",
                  }}
                  aria-busy={loading}
                >
                  <ButtonLoadingLabel
                    loading={loading}
                    label="Suggest more"
                    loadingLabel="Generating…"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
