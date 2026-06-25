"use client";

interface Props {
  current: number;
  total: number;
}

const DOT_SIZE = 12;

export default function ProgressDots({ current, total }: Props) {
  return (
    <div
      style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}
      aria-label={`Clues revealed: ${current} of ${total}`}
      role="status"
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        return (
          <span
            key={i}
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              background: filled ? "var(--ag-accent)" : "var(--ag-border)",
              transition: "background 0.35s ease, transform 0.35s ease",
              transform: filled ? "scale(1)" : "scale(0.78)",
              display: "inline-block",
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}