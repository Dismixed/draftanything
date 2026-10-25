"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HOT_CATEGORIES } from "./hot-categories";
import { TopicSuggestions } from "./topic-suggestions";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface SoloFormProps {
  /** Pre-fill the topic (e.g. when arriving from a suggestion on the landing page). */
  initialTopic?: string;
}

const DEFAULT_VALUES = {
  displayName: "",
  topic: "",
  opponents: 3,
  rounds: 5,
  pickingMode: "pool" as "pool" | "off_the_dome",
  draftType: "standard" as "standard" | "snake" | "random",
  aiPersonality: "analyst" as "analyst" | "hype" | "roast" | "custom",
  customJudgePrompt: "",
};

/**
 * Starts a draft for one person against AI drafters. The same fields as
 * creating a room, minus the ones a solo draft has no use for: there is no
 * turn timer, and the AI judge always decides.
 */
export function SoloForm({ initialTopic = "" }: SoloFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({ ...DEFAULT_VALUES, topic: initialTopic });
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

      const res = await fetch("/api/drafts/solo", {
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

      router.push(`/draft/${data.roomCode}`);
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
      aria-label="Play solo"
    >
      {/* Topic hero */}
      <section className="create-room-topic-hero" aria-labelledby="solo-topic-heading">
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
              id="solo-topic-heading"
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
                fontFamily: 'var(--font-playfair-display), serif',
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
          id="solo-topic"
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
        <div className="create-room-hot-grid" role="list" aria-label="Popular draft categories for a solo draft">
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
          <label htmlFor="solo-display-name" className="create-room-label">
            Your display name
          </label>
          <input
            id="solo-display-name"
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
          <label htmlFor="solo-opponents" className="create-room-label">
            AI opponents (1–5)
          </label>
          <input
            id="solo-opponents"
            type="number"
            required
            min={1}
            max={5}
            value={form.opponents}
            onChange={(e) => handleChange("opponents", Number(e.target.value))}
            className="da-input"
          />
        </div>

        <div className="create-room-field">
          <label htmlFor="solo-rounds" className="create-room-label">
            Rounds (1–10)
          </label>
          <input
            id="solo-rounds"
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
            <label htmlFor="solo-draft-type" className="create-room-label">
              Draft type
            </label>
            <select
              id="solo-draft-type"
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
            <label htmlFor="solo-personality" className="create-room-label">
              AI judge
            </label>
            <select
              id="solo-personality"
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

          {form.aiPersonality === "custom" && (
            <div className="create-room-field span-2">
              <label htmlFor="solo-custom-judge" className="create-room-label">
                Custom judge instructions
              </label>
              <textarea
                id="solo-custom-judge"
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

      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.6 }}>
        AI drafters pick on their own turns. No turn timer, and the AI judge ranks every
        lineup, yours included.
      </p>

      {error && (
        <p role="alert" style={{ color: "#ff4d4d", fontSize: "12px", margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold"
      >
        <ButtonLoadingLabel
          loading={submitting}
          label="Start solo draft"
          loadingLabel="Setting the table…"
        />
      </button>
    </form>
  );
}
