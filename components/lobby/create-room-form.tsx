"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HOT_CATEGORIES } from "./hot-categories";
import { TopicSuggestions } from "./topic-suggestions";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

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

export function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspireInterests, setInspireInterests] = useState<string | undefined>();

  function handleChange<K extends keyof typeof DEFAULT_VALUES>(
    key: K,
    value: (typeof DEFAULT_VALUES)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function selectHotCategory(topic: string, interest: string) {
    handleChange("topic", topic);
    setInspireInterests(interest);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
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

  const activeCategoryId = HOT_CATEGORIES.find((c) => c.topic === form.topic)?.id;

  return (
    <form
      onSubmit={handleSubmit}
      className="create-room-form"
      aria-label="Create a room"
    >
      {/* Topic hero */}
      <section className="create-room-topic-hero" aria-labelledby="topic-hero-heading">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "10px",
          }}
        >
          <div>
            <p
              id="topic-hero-heading"
              style={{
                margin: 0,
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--gold)",
                opacity: 0.85,
              }}
            >
              Draft topic
            </p>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: '"Playfair Display", serif',
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              What are you drafting?
            </h2>
          </div>
          <TopicSuggestions
            initialInterests={inspireInterests}
            onSelect={(topic) => handleChange("topic", topic)}
          />
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
          className="da-input create-room-topic-input"
          aria-label="Draft topic"
        />

        <p
          style={{
            margin: "12px 0 8px",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
          }}
        >
          Hot right now
        </p>
        <div className="create-room-hot-grid" role="list" aria-label="Popular draft categories">
          {HOT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              role="listitem"
              className={`create-room-hot-chip${activeCategoryId === category.id ? " active" : ""}`}
              onClick={() => selectHotCategory(category.topic, category.interest)}
              aria-pressed={activeCategoryId === category.id}
            >
              <span aria-hidden="true">{category.emoji}</span>
              {category.label}
            </button>
          ))}
        </div>
      </section>

      {/* Identity + size */}
      <div className="create-room-settings-grid">
        <div className="create-room-field span-2">
          <label htmlFor="create-display-name" className="create-room-label">
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

        <div className="create-room-field">
          <label htmlFor="create-max-players" className="create-room-label">
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

        <div className="create-room-field">
          <label htmlFor="create-rounds" className="create-room-label">
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

      {/* Game rules — two columns */}
      <div>
        <p className="create-room-section-label">Game rules</p>
        <div className="create-room-settings-grid">
          <div className="create-room-field">
            <span className="create-room-label">Draft mode</span>
            <div className="create-room-segmented">
              {(["pool", "off_the_dome"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={form.pickingMode === mode ? "active" : ""}
                  onClick={() => handleChange("pickingMode", mode)}
                >
                  {mode === "pool" ? "From a Pool" : "Off the Dome"}
                </button>
              ))}
            </div>
          </div>

          <div className="create-room-field">
            <label htmlFor="create-draft-type" className="create-room-label">
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
              <option value="standard">Standard (linear)</option>
              <option value="snake">Snake (reverses)</option>
              <option value="random">Random</option>
            </select>
          </div>

          <div className="create-room-field">
            <label htmlFor="create-judging-mode" className="create-room-label">
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
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="create-room-field">
            <label htmlFor="create-personality" className="create-room-label">
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
              <option value="analyst">Analyst</option>
              <option value="hype">Hype</option>
              <option value="roast">Roast</option>
              <option value="custom">Custom judge</option>
            </select>
          </div>

          <div className="create-room-field span-2">
            <span className="create-room-label">Turn timer</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: form.timerSeconds === null ? "var(--gold)" : "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="timer"
                  checked={form.timerSeconds === null}
                  onChange={() => handleChange("timerSeconds", null)}
                  style={{ accentColor: "var(--gold)" }}
                />
                Off
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: form.timerSeconds !== null ? "var(--gold)" : "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="timer"
                  checked={form.timerSeconds !== null}
                  onChange={() => handleChange("timerSeconds", 60)}
                  style={{ accentColor: "var(--gold)" }}
                />
                On
              </label>
              {form.timerSeconds !== null && (
                <>
                  <input
                    type="number"
                    min={15}
                    max={180}
                    value={form.timerSeconds}
                    onChange={(e) => handleChange("timerSeconds", Number(e.target.value))}
                    className="da-input"
                    style={{ width: "72px" }}
                    aria-label="Timer seconds"
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>seconds</span>
                </>
              )}
            </div>
          </div>

          {form.aiPersonality === "custom" && (
            <div className="create-room-field span-2">
              <label htmlFor="create-custom-judge" className="create-room-label">
                Custom judge instructions
              </label>
              <textarea
                id="create-custom-judge"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                placeholder="e.g. Judge like a skeptical food critic who rewards originality."
                value={form.customJudgePrompt}
                onChange={(e) => handleChange("customJudgePrompt", e.target.value)}
                className="da-input"
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "#ff4d4d", fontSize: "12px", margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold"
        aria-label="Create room"
      >
        <ButtonLoadingLabel
          loading={submitting}
          label="— Establish Room —"
          loadingLabel="Establishing…"
        />
      </button>
    </form>
  );
}
