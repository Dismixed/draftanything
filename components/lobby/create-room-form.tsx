"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopicSuggestions } from "./topic-suggestions";

interface CreateRoomFormProps {
  onSuccess?: (draftId: string, roomCode: string) => void;
}

const DEFAULT_VALUES = {
  displayName: "",
  topic: "",
  maxPlayers: 4,
  rounds: 5,
  timerSeconds: 60 as number | null,
  pickingMode: "pool" as "pool" | "off_the_dome",
  draftType: "standard" as "standard" | "snake" | "random",
  judgingMode: "ai" as "ai" | "community" | "hybrid",
  aiPersonality: "analyst" as "analyst" | "hype" | "roast" | "custom",
  customJudgePrompt: "",
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  fontWeight: 600,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
  marginBottom: '5px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

export function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof typeof DEFAULT_VALUES>(
    key: K,
    value: (typeof DEFAULT_VALUES)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Ensure guest session exists before creating room
      await fetch("/api/guest", { method: "POST" });

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customJudgePrompt:
            form.aiPersonality === "custom" ? form.customJudgePrompt.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Something went wrong");
        return;
      }

      if (onSuccess) {
        onSuccess(data.draftId, data.roomCode);
      } else {
        router.push(`/draft/${data.roomCode}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      aria-label="Create a room"
    >
      <div style={fieldStyle}>
        <label htmlFor="create-display-name" style={labelStyle}>
          Your display name
        </label>
        <input
          id="create-display-name"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="e.g. Alice"
          value={form.displayName}
          onChange={(e) => handleChange("displayName", e.target.value)}
          className="da-input"
        />
      </div>

      <div style={fieldStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
          <label htmlFor="create-topic" style={{ ...labelStyle, marginBottom: 0 }}>
            Draft topic
          </label>
          <TopicSuggestions onSelect={(topic) => handleChange("topic", topic)} />
        </div>
        <input
          id="create-topic"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Best TV Shows of the 90s"
          value={form.topic}
          onChange={(e) => handleChange("topic", e.target.value)}
          className="da-input"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label htmlFor="create-max-players" style={labelStyle}>
            Players (2–6)
          </label>
          <input
            id="create-max-players"
            type="number"
            required
            min={2}
            max={6}
            value={form.maxPlayers}
            onChange={(e) => handleChange("maxPlayers", Number(e.target.value))}
            className="da-input"
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="create-rounds" style={labelStyle}>
            Rounds (1–10)
          </label>
          <input
            id="create-rounds"
            type="number"
            required
            min={1}
            max={10}
            value={form.rounds}
            onChange={(e) => handleChange("rounds", Number(e.target.value))}
            className="da-input"
          />
        </div>
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Draft mode</span>
        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {(["pool", "off_the_dome"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleChange("pickingMode", mode)}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: form.pickingMode === mode ? 'var(--gold)' : 'var(--bg-secondary)',
                color: form.pickingMode === mode ? '#000' : 'var(--text-dim)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {mode === "pool" ? "From a Pool" : "Off the Dome"}
            </button>
          ))}
        </div>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="create-draft-type" style={labelStyle}>
          Draft type
        </label>
        <select
          id="create-draft-type"
          value={form.draftType}
          onChange={(e) =>
            handleChange("draftType", e.target.value as "standard" | "snake" | "random")
          }
          className="da-select"
        >
          <option value="standard">Standard (linear order)</option>
          <option value="snake">Snake (reverses each round)</option>
          <option value="random">Random</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="create-judging-mode" style={labelStyle}>
          Judging mode
        </label>
        <select
          id="create-judging-mode"
          value={form.judgingMode}
          onChange={(e) =>
            handleChange(
              "judgingMode",
              e.target.value as "ai" | "community" | "hybrid",
            )
          }
          className="da-select"
        >
          <option value="ai">AI judge</option>
          <option value="community">Community vote</option>
          <option value="hybrid">Hybrid (AI + community)</option>
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="create-personality" style={labelStyle}>
          AI personality
        </label>
        <select
          id="create-personality"
          value={form.aiPersonality}
          onChange={(e) => {
            const aiPersonality = e.target.value as
              | "analyst"
              | "hype"
              | "roast"
              | "custom";
            setForm((prev) => ({
              ...prev,
              aiPersonality,
              customJudgePrompt: aiPersonality === "custom" ? prev.customJudgePrompt : "",
            }));
            setError(null);
          }}
          className="da-select"
        >
          <option value="analyst">Analyst (thoughtful, data-driven)</option>
          <option value="hype">Hype (energetic, enthusiastic)</option>
          <option value="roast">Roast (playful trash talk)</option>
          <option value="custom">Custom judge</option>
        </select>
      </div>

      {form.aiPersonality === "custom" && (
        <div style={fieldStyle}>
          <label htmlFor="create-custom-judge" style={labelStyle}>
            Custom judge instructions
          </label>
          <textarea
            id="create-custom-judge"
            required
            minLength={10}
            maxLength={500}
            rows={4}
            placeholder="e.g. Judge like a skeptical food critic who rewards originality and punishes safe picks."
            value={form.customJudgePrompt}
            onChange={(e) => handleChange("customJudgePrompt", e.target.value)}
            className="da-input"
            style={{ resize: "vertical", minHeight: "96px" }}
          />
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-dim)" }}>
            Describe how the AI should evaluate rosters. 10–500 characters.
          </p>
        </div>
      )}

      <div style={fieldStyle}>
        <span style={labelStyle}>Turn timer</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: form.timerSeconds === null ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="timer"
              checked={form.timerSeconds === null}
              onChange={() => handleChange("timerSeconds", null)}
              style={{ accentColor: 'var(--gold)' }}
            />
            Off
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: form.timerSeconds !== null ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="timer"
              checked={form.timerSeconds !== null}
              onChange={() => handleChange("timerSeconds", 60)}
              style={{ accentColor: 'var(--gold)' }}
            />
            On
          </label>
          {form.timerSeconds !== null && (
            <input
              type="number"
              min={15}
              max={180}
              value={form.timerSeconds}
              onChange={(e) => handleChange("timerSeconds", Number(e.target.value))}
              className="da-input"
              style={{ width: '72px' }}
              aria-label="Timer seconds"
            />
          )}
          {form.timerSeconds !== null && (
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>seconds</span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#ff4d4d', fontSize: '12px', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold"
        style={{ marginTop: '4px' }}
      >
        {submitting ? "Establishing…" : "— Establish Room —"}
      </button>
    </form>
  );
}
