"use client";
import { useState } from "react";
import posthog from "posthog-js";
import { CreateRoomForm } from "@/components/lobby/create-room-form";
import { JoinRoomForm } from "@/components/lobby/join-room-form";

type ActiveTab = "create" | "join";

export default function DraftAnythingLobby() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("create");

  return (
    <main className="game-page" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Atmospheric background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 55% at 50% -5%, rgba(201,168,76,0.07) 0%, transparent 55%), radial-gradient(ellipse 60% 45% at 10% 90%, rgba(124,58,255,0.06) 0%, transparent 55%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: activeTab === "create" ? '680px' : '440px', position: 'relative', zIndex: 1, transition: 'max-width 0.25s ease' }}>
        {/* Crest */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', position: 'relative' }}>
            <span style={{ color: 'var(--gold)', fontSize: '14px' }}>&#9670;</span>
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.38em', textTransform: 'uppercase', color: 'var(--gold)', opacity: 0.8, marginBottom: '12px' }}>
            Private Draft Room
          </div>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(44px, 12vw, 58px)', fontWeight: 900, lineHeight: 0.92, textAlign: 'center', color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
            Draft<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold-hi)', textShadow: '0 0 40px rgba(240,200,96,0.2)' }}>Anything</em>
          </h1>
          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', margin: '14px 0 10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-hi))' }} />
            <span style={{ color: 'var(--gold)', fontSize: '7px', opacity: 0.45 }}>&#9670;</span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--border-hi), transparent)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
            Pick your lineup. Argue for it.<br />Let the room judge.
          </p>
        </div>

        {/* Card */}
        <div className="panel-card">
          {/* Tabs */}
          <div role="tablist" aria-label="Room options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            <button
              role="tab"
              id="tab-create"
              aria-selected={activeTab === "create"}
              aria-controls="panel-create"
              onClick={() => {
                setActiveTab("create");
                posthog.capture("draft_lobby_tab_changed", { tab: "create" });
              }}
              style={{
                padding: '13px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'Outfit, sans-serif',
                background: activeTab === "create" ? 'rgba(201,168,76,0.04)' : 'transparent',
                color: activeTab === "create" ? 'var(--gold)' : 'var(--text-dim)',
                border: 'none',
                borderBottom: activeTab === "create" ? '1px solid var(--gold)' : '1px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              Create Room
            </button>
            <button
              role="tab"
              id="tab-join"
              aria-selected={activeTab === "join"}
              aria-controls="panel-join"
              onClick={() => {
                setActiveTab("join");
                posthog.capture("draft_lobby_tab_changed", { tab: "join" });
              }}
              style={{
                padding: '13px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontFamily: 'Outfit, sans-serif',
                background: activeTab === "join" ? 'rgba(201,168,76,0.04)' : 'transparent',
                color: activeTab === "join" ? 'var(--gold)' : 'var(--text-dim)',
                border: 'none',
                borderBottom: activeTab === "join" ? '1px solid var(--gold)' : '1px solid transparent',
                marginBottom: '-1px',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
            >
              Join Room
            </button>
          </div>

          <div style={{ padding: activeTab === "create" ? '20px 24px' : '20px' }}>
            <div id="panel-create" role="tabpanel" aria-labelledby="tab-create" hidden={activeTab !== "create"}>
              <CreateRoomForm />
            </div>
            <div id="panel-join" role="tabpanel" aria-labelledby="tab-join" hidden={activeTab !== "join"}>
              <JoinRoomForm />
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '20px', opacity: 0.6 }}>
          No account needed. Pick a name and get a room code.
        </p>
      </div>
    </main>
  );
}
