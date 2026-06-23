"use client";

import { useState } from "react";
import type { RoomProjection } from "@/features/room/schema";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";
import { LobbyConfigSummary } from "./lobby-config-summary";

interface LobbyConfigFormProps {
  room: RoomProjection;
  playerCount: number;
  onSaved: (room: RoomProjection) => void;
}

type ConfigForm = {
  topic: string;
  maxPlayers: number;
  rounds: number;
  timerSeconds: number | null;
  pickingMode: "pool" | "off_the_dome";
  draftType: "standard" | "snake" | "random";
  judgingMode: "ai" | "community" | "hybrid";
  aiPersonality: "analyst" | "hype" | "roast" | "custom";
  customJudgePrompt: string;
};

function roomToForm(room: RoomProjection): ConfigForm {
  return {
    topic: room.topic,
    maxPlayers: room.maxPlayers,
    rounds: room.rounds,
    timerSeconds: room.timerSeconds,
    pickingMode: room.pickingMode,
    draftType: room.draftType,
    judgingMode: room.judgingMode,
    aiPersonality: room.aiPersonality,
    customJudgePrompt: room.customJudgePrompt ?? "",
  };
}

export function LobbyConfigForm({
  room,
  playerCount,
  onSaved,
}: LobbyConfigFormProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ConfigForm>(() => roomToForm(room));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleCancel() {
    setForm(roomToForm(room));
    setError(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${room.draftId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customJudgePrompt:
            form.aiPersonality === "custom" ? form.customJudgePrompt.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Failed to save settings");
        return;
      }

      onSaved(data as RoomProjection);
      setEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "9px",
    fontWeight: 600,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "var(--text-dim)",
    marginBottom: "12px",
    display: "block",
  };

  if (!editing) {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              margin: 0,
            }}
          >
            Configuration
          </span>
          <button
            type="button"
            onClick={() => {
              setForm(roomToForm(room));
              setEditing(true);
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-hi)",
              color: "var(--text-dim)",
              fontFamily: "Outfit, sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              padding: "6px 12px",
            }}
          >
            Edit
          </button>
        </div>
        <LobbyConfigSummary room={room} playerCount={playerCount} hideLabel />
      </>
    );
  }

  return (
    <form onSubmit={handleSave} aria-label="Edit room configuration">
      <span style={sectionLabelStyle}>Edit configuration</span>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label htmlFor="lobby-topic" className="create-room-label">
            Draft topic
          </label>
          <input
            id="lobby-topic"
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={form.topic}
            onChange={(e) => handleChange("topic", e.target.value)}
            className="da-input"
          />
        </div>

        <div className="create-room-settings-grid">
          <div className="create-room-field">
            <label htmlFor="lobby-max-players" className="create-room-label">
              Max players (2–6)
            </label>
            <input
              id="lobby-max-players"
              type="number"
              required
              min={Math.max(2, playerCount)}
              max={6}
              value={form.maxPlayers}
              onChange={(e) => handleChange("maxPlayers", Number(e.target.value))}
              className="da-input"
            />
          </div>

          <div className="create-room-field">
            <label htmlFor="lobby-rounds" className="create-room-label">
              Rounds (1–10)
            </label>
            <input
              id="lobby-rounds"
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
            <label htmlFor="lobby-draft-type" className="create-room-label">
              Draft type
            </label>
            <select
              id="lobby-draft-type"
              value={form.draftType}
              onChange={(e) =>
                handleChange("draftType", e.target.value as ConfigForm["draftType"])
              }
              className="da-select"
            >
              <option value="standard">Standard (linear)</option>
              <option value="snake">Snake (reverses)</option>
              <option value="random">Random</option>
            </select>
          </div>

          <div className="create-room-field">
            <label htmlFor="lobby-judging-mode" className="create-room-label">
              Judging mode
            </label>
            <select
              id="lobby-judging-mode"
              value={form.judgingMode}
              onChange={(e) =>
                handleChange("judgingMode", e.target.value as ConfigForm["judgingMode"])
              }
              className="da-select"
            >
              <option value="ai">AI judge</option>
              <option value="community">Community vote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div className="create-room-field">
            <label htmlFor="lobby-personality" className="create-room-label">
              AI personality
            </label>
            <select
              id="lobby-personality"
              value={form.aiPersonality}
              onChange={(e) => {
                const aiPersonality = e.target.value as ConfigForm["aiPersonality"];
                setForm((prev) => ({
                  ...prev,
                  aiPersonality,
                  customJudgePrompt:
                    aiPersonality === "custom" ? prev.customJudgePrompt : "",
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
                  name="lobby-timer"
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
                  name="lobby-timer"
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
              <label htmlFor="lobby-custom-judge" className="create-room-label">
                Custom judge instructions
              </label>
              <textarea
                id="lobby-custom-judge"
                required
                minLength={10}
                maxLength={500}
                rows={3}
                value={form.customJudgePrompt}
                onChange={(e) => handleChange("customJudgePrompt", e.target.value)}
                className="da-input"
                style={{ resize: "vertical", minHeight: "80px" }}
              />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" style={{ color: "#ff4d4d", fontSize: "12px", margin: 0 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          <button type="submit" disabled={saving} className="btn-gold" style={{ flex: 1 }}>
            <ButtonLoadingLabel loading={saving} label="Save" loadingLabel="Saving…" />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="btn-ghost"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
