"use client";

import { useCallback, useState, type FormEvent, type KeyboardEvent } from "react";

interface OffTheDomeInputProps {
  isMyTurn: boolean;
  currentPlayerName: string;
  onSubmit: (itemName: string) => Promise<void>;
  isSubmitting: boolean;
}

export function OffTheDomeInput({
  isMyTurn,
  currentPlayerName,
  onSubmit,
  isSubmitting,
}: OffTheDomeInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const canSubmit = isMyTurn && !isSubmitting && trimmed.length > 0 && trimmed.length <= 200;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await onSubmit(trimmed);
      setValue("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pick failed";
      if (msg.includes("ITEM_UNAVAILABLE") || msg.includes("duplicate")) {
        setError("That pick has already been taken");
      } else {
        setError(msg);
      }
    }
  }, [canSubmit, trimmed, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: "rgba(11,14,28,0.97)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border-hi)",
        padding: "12px 16px",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      {error && (
        <p
          style={{
            color: "#ff4d4d",
            fontSize: "12px",
            margin: "0 0 8px 0",
            textAlign: "center",
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      {isMyTurn ? (
        <form
          onSubmit={handleFormSubmit}
          style={{
            display: "flex",
            gap: "8px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your pick..."
            maxLength={200}
            disabled={isSubmitting}
            autoFocus
            aria-label="Pick item name"
            style={{
              flex: 1,
              background: "var(--panel)",
              border: "1px solid var(--border-hi)",
              borderRadius: "6px",
              padding: "10px 14px",
              color: "var(--text)",
              fontSize: "14px",
              outline: "none",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? "var(--gold)" : "var(--panel)",
              color: canSubmit ? "#0b0e1c" : "var(--text-dim)",
              border: canSubmit ? "none" : "1px solid var(--border-hi)",
              borderRadius: "6px",
              padding: "10px 20px",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 0.15s, opacity 0.15s",
              opacity: isSubmitting ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--text-dim)",
                    display: "inline-block",
                    animation: "pulse 1s infinite",
                  }}
                />
                Draft
              </>
            ) : (
              "Draft"
            )}
          </button>
        </form>
      ) : (
        <p
          style={{
            textAlign: "center",
            fontSize: "13px",
            color: "var(--text-dim)",
            margin: 0,
            padding: "4px 0",
          }}
        >
          Waiting for{" "}
          <span style={{ color: "var(--text)" }}>{currentPlayerName}</span>...
        </p>
      )}
    </div>
  );
}
