"use client";

import type { RoomProjection } from "@/features/room/schema";

interface LobbyConfigSummaryProps {
  room: RoomProjection;
  playerCount: number;
  hideLabel?: boolean;
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

export function LobbyConfigSummary({ room, playerCount, hideLabel }: LobbyConfigSummaryProps) {
  return (
    <>
      {!hideLabel && (
        <span id="config-label" style={sectionLabelStyle}>
          Configuration
        </span>
      )}
      <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", margin: 0 }}>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Draft type</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500, textTransform: "capitalize" }}>
            {room.draftType}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Mode</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500 }}>
            {room.pickingMode === "off_the_dome" ? "Off the Dome" : "From a Pool"}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Judging</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500, textTransform: "capitalize" }}>
            {room.judgingMode}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Rounds</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500 }}>{room.rounds}</dd>
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Turn timer</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500 }}>
            {room.timerSeconds ? `${room.timerSeconds}s` : "Off"}
          </dd>
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>AI judge</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500, textTransform: "capitalize" }}>
            {room.aiPersonality === "custom" ? "Custom" : room.aiPersonality}
          </dd>
          {room.aiPersonality === "custom" && room.customJudgePrompt && (
            <dd style={{ fontSize: "12px", color: "var(--text-dim)", margin: "4px 0 0", lineHeight: 1.4 }}>
              {room.customJudgePrompt}
            </dd>
          )}
        </div>
        <div>
          <dt style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "2px" }}>Capacity</dt>
          <dd style={{ fontSize: "13px", color: "var(--text)", margin: 0, fontWeight: 500 }}>
            {playerCount}/{room.maxPlayers} players
          </dd>
        </div>
      </dl>
    </>
  );
}
