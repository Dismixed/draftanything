"use client";

interface DailyIntroModalProps {
  onStart: () => void;
}

const RULES = [
  {
    title: "15 Questions",
    body: "Everyone gets the same trivia set today. Answer as many as you can.",
  },
  {
    title: "One Wrong Answer Ends It",
    body: "Get a question wrong or run out of time and your run is over.",
  },
  {
    title: "Speed Scores Points",
    body: "Harder questions are worth more. Faster correct answers earn bonus points.",
  },
  {
    title: "One Shot Per Day",
    body: "Play once, submit your score, then come back tomorrow for a new challenge.",
  },
] as const;

export default function DailyIntroModal({ onStart }: DailyIntroModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily challenge intro"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="anim-fade-slide-up"
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--bd-surface)",
          border: "1px solid var(--bd-border)",
          borderRadius: "12px",
          padding: "28px 24px 24px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--bd-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: "inline-block", marginBottom: "10px" }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--bd-text)",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            Daily Challenge
          </h2>
          <p
            style={{
              fontSize: "11px",
              color: "var(--bd-text-muted)",
              margin: 0,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            15 questions · One shot
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {RULES.map((rule, i) => (
            <div key={rule.title} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(217, 119, 6, 0.15)",
                  border: "1px solid var(--bd-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--bd-primary)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--bd-text)",
                    marginBottom: "3px",
                  }}
                >
                  {rule.title}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--bd-text-muted)",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          style={{
            marginTop: "24px",
            padding: "14px",
            width: "100%",
            background: "var(--bd-primary)",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.5px",
          }}
        >
          Start Challenge
        </button>
      </div>
    </div>
  );
}
