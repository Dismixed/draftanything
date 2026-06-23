"use client";

import {
  useCallback,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

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
  const [focused, setFocused] = useState(false);

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
        background: isMyTurn
          ? "linear-gradient(180deg, rgba(201,168,76,0.08) 0%, rgba(11,14,28,0.98) 40%)"
          : "rgba(11,14,28,0.97)",
        backdropFilter: "blur(12px)",
        borderTop: isMyTurn
          ? "2px solid var(--gold)"
          : "1px solid var(--border-hi)",
        boxShadow: isMyTurn
          ? "0 -8px 32px rgba(201,168,76,0.14), 0 -2px 16px rgba(0,0,0,0.45)"
          : "0 -2px 12px rgba(0,0,0,0.35)",
        padding: isMyTurn ? "18px 20px" : "14px 16px",
        paddingBottom: isMyTurn
          ? "max(18px, env(safe-area-inset-bottom))"
          : "max(14px, env(safe-area-inset-bottom))",
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
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 10px 0",
              textAlign: "center",
            }}
          >
            Your pick
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "stretch",
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type your pick..."
            maxLength={200}
            disabled={isSubmitting}
            autoFocus
            aria-label="Pick item name"
            style={{
              flex: 1,
              background: "var(--panel-alt)",
              border: focused
                ? "2px solid var(--gold-hi)"
                : "2px solid rgba(201,168,76,0.45)",
              borderRadius: "8px",
              padding: "14px 18px",
              color: "var(--text)",
              fontSize: "16px",
              fontWeight: 500,
              outline: "none",
              opacity: isSubmitting ? 0.6 : 1,
              boxShadow: focused
                ? "0 0 0 3px rgba(201,168,76,0.18), 0 0 28px rgba(201,168,76,0.12) inset"
                : "0 0 24px rgba(201,168,76,0.08) inset",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              background: canSubmit ? "var(--gold)" : "var(--panel)",
              color: canSubmit ? "#0b0e1c" : "var(--text-dim)",
              border: canSubmit ? "none" : "1px solid var(--border-hi)",
              borderRadius: "8px",
              padding: "14px 24px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "background 0.15s, opacity 0.15s, box-shadow 0.15s",
              opacity: isSubmitting ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
              boxShadow: canSubmit
                ? "0 0 20px rgba(201,168,76,0.28)"
                : "none",
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
          </div>
        </form>
      ) : (
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "var(--text-dim)",
            margin: 0,
            padding: "6px 0",
          }}
        >
          Waiting for{" "}
          <span style={{ color: "var(--text)" }}>{currentPlayerName}</span>...
        </p>
      )}
    </div>
  );
}
