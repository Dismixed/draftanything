"use client";

interface Props {
  current: number;
  total: number;
  active?: number;
}

const DOT_SIZE = 12;

export default function ProgressDots({ current, total, active }: Props) {
  const activeIndex = active ?? Math.max(0, current - 1);

  return (
    <div
      style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}
      aria-label={`Viewing clue ${activeIndex + 1}, ${current} of ${total} revealed`}
      role="status"
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        const isActive = filled && i === activeIndex;
        return (
          <span
            key={i}
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              background: filled ? "var(--ag-accent)" : "var(--ag-border)",
              transition: "background 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease",
              transform: isActive ? "scale(1.25)" : filled ? "scale(1)" : "scale(0.78)",
              boxShadow: isActive ? "0 0 0 2px var(--ag-bg), 0 0 0 3px var(--ag-accent)" : undefined,
              display: "inline-block",
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}