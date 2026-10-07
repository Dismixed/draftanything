"use client";

interface DailyIntroModalProps {
  onStart: () => void;
}

const RULES = [
  {
    title: "15 Questions",
    body: "Everyone gets the same set today. Answer as many as you can.",
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
    body: "Play once and post your score. Tomorrow gets a fresh set.",
  },
] as const;

export default function DailyIntroModal({ onStart }: DailyIntroModalProps) {
  return (
    <div className="bd-modal-scrim" role="dialog" aria-modal="true" aria-label="Daily challenge intro">
      <div className="bd-modal anim-fade-slide-up">
        <div className="bd-modal-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h2>Daily Challenge</h2>
        <p className="bd-modal-sub">15 questions · One shot</p>

        <ol className="bd-rules">
          {RULES.map((rule, i) => (
            <li key={rule.title}>
              <span className="bd-rule-n">{i + 1}</span>
              <div>
                <b>{rule.title}</b>
                <p>{rule.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="bd-cta" onClick={onStart}>
          Start Challenge
        </button>
      </div>
    </div>
  );
}
