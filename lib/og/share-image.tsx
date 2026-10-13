import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import { GAMES, getGame } from "@/lib/games/registry";
import { SHARE_IMAGE_SIZE, type ShareImageId } from "./metadata";

interface Palette {
  bg: string;
  panel: string;
  line: string;
  text: string;
  dim: string;
  /** Colour of the second half of the game's name, as on the site. */
  brand: string;
  accent: string;
}

// The dark theme of each game. The site's colours are CSS variables, which an image cannot read.
const PALETTES: Record<ShareImageId, Palette> = {
  home: { bg: "#07090f", panel: "#0f1320", line: "#232a40", text: "#f3f0e6", dim: "#a3a9bf", brand: "#f0c860", accent: "#f0c860" },
  chainlink: { bg: "#121213", panel: "#1a1a1b", line: "#3a3a3c", text: "#ffffff", dim: "#b4b4b8", brand: "#c9b458", accent: "#6aaa64" },
  "brain-dead": { bg: "#0f172a", panel: "#1e293b", line: "#334155", text: "#e2e8f0", dim: "#a9b6c9", brand: "#d97706", accent: "#d97706" },
  anyguessr: { bg: "#07090f", panel: "#0b0e1c", line: "#2a3358", text: "#f3f0e6", dim: "#aab0c6", brand: "#5d8f56", accent: "#e0a858" },
  "hot-takes": { bg: "#0b0b0e", panel: "#16161c", line: "#2c2c36", text: "#f5f4f2", dim: "#aeacb6", brand: "#ff3b3b", accent: "#ff5a36" },
  freezeframes: { bg: "#0c0812", panel: "#130f1e", line: "#2d2550", text: "#f0eaff", dim: "#b3a9cc", brand: "#a855f7", accent: "#a855f7" },
  "ball-knowledge": { bg: "#0a1830", panel: "#122a52", line: "#24457c", text: "#eef4ff", dim: "#a5b9d9", brand: "#5b9ee8", accent: "#ffb020" },
  "getting-warmer": { bg: "#0a0705", panel: "#150e08", line: "#33241a", text: "#fff3ea", dim: "#c2b0a3", brand: "#ff6b1a", accent: "#ff6b1a" },
  "draft-anything": { bg: "#07090f", panel: "#0f1320", line: "#232a40", text: "#ddd8cc", dim: "#a3a9bf", brand: "#f0c860", accent: "#f0c860" },
  "slippery-slope": { bg: "#0d1117", panel: "#131c27", line: "#1f3050", text: "#e8f4ff", dim: "#a4b6cc", brand: "#b5f23d", accent: "#b5f23d" },
};

const row: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center" };
const col: CSSProperties = { display: "flex", flexDirection: "column" };

/** A small picture of how each game plays, drawn from boxes so it needs no artwork. */
const MOTIFS: Record<ShareImageId, (p: Palette) => ReactNode> = {
  home: (p) => (
    <div style={{ ...row, flexWrap: "wrap", width: 348, gap: 12 }}>
      {GAMES.map((game) => (
        <div
          key={game.id}
          style={{ ...col, justifyContent: "flex-end", width: 108, height: 108, padding: 12, borderRadius: 18, background: p.panel, border: `2px solid ${p.line}` }}
        >
          <div style={{ display: "flex", width: 26, height: 26, borderRadius: 13, background: PALETTES[game.id].brand, marginBottom: 12 }} />
          <div style={{ display: "flex", fontSize: 15, fontWeight: 800, color: p.text, lineHeight: 1.1 }}>{game.name}</div>
        </div>
      ))}
    </div>
  ),
  chainlink: (p) => (
    <div style={{ ...col, alignItems: "center", width: 320 }}>
      {["SNOW", "BALL", "PARK", "?"].map((word, i) => (
        <div key={word} style={{ ...col, alignItems: "center" }}>
          {i > 0 && <div style={{ display: "flex", width: 6, height: 20, background: i < 3 ? p.accent : p.line }} />}
          <div
            style={{
              ...row,
              justifyContent: "center",
              width: 320,
              height: 84,
              borderRadius: 16,
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: 4,
              color: i < 3 ? "#ffffff" : p.brand,
              background: i < 3 ? p.accent : p.panel,
              border: i < 3 ? `3px solid ${p.accent}` : `3px dashed ${p.brand}`,
            }}
          >
            {word}
          </div>
        </div>
      ))}
    </div>
  ),
  "brain-dead": (p) => (
    <div style={{ ...col, width: 340, padding: 24, borderRadius: 24, background: p.panel, border: `2px solid ${p.line}` }}>
      <svg width="292" height="170" viewBox="0 0 292 170">
        <polyline
          points="0,95 40,95 54,70 66,95 92,95 104,20 118,150 130,95 160,95 174,74 186,95 206,95 292,95"
          fill="none"
          stroke={p.accent}
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div style={{ ...row, flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} style={{ display: "flex", width: 28, height: 12, borderRadius: 6, background: i < 9 ? p.accent : p.line }} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 18, fontSize: 24, fontWeight: 500, color: p.dim }}>Question 10 of 15</div>
    </div>
  ),
  anyguessr: (p) => {
    const stamps = [
      { ink: p.brand, label: "100", tilt: -8 },
      { ink: p.accent, label: "72", tilt: 6 },
      { ink: p.brand, label: "100", tilt: -4 },
      { ink: p.accent, label: "58", tilt: 9 },
      { ink: null, label: "5", tilt: 0 },
      { ink: null, label: "6", tilt: 0 },
      { ink: null, label: "7", tilt: 0 },
    ];
    return (
      <div style={{ ...row, flexWrap: "wrap", justifyContent: "center", width: 350, gap: 16 }}>
        {stamps.map((stamp, i) => (
          <div
            key={i}
            style={{
              ...row,
              justifyContent: "center",
              width: 100,
              height: 100,
              borderRadius: 50,
              fontSize: stamp.ink ? 34 : 30,
              fontWeight: 800,
              color: stamp.ink ?? p.dim,
              border: stamp.ink ? `5px solid ${stamp.ink}` : `3px dashed ${p.line}`,
              transform: `rotate(${stamp.tilt}deg)`,
            }}
          >
            {stamp.label}
          </div>
        ))}
      </div>
    );
  },
  "hot-takes": (p) => {
    const tiers = [
      { letter: "S", color: "#ff5a36", items: 2 },
      { letter: "A", color: "#ff9a36", items: 4 },
      { letter: "B", color: "#ffd036", items: 3 },
      { letter: "C", color: "#7bd88f", items: 4 },
      { letter: "D", color: "#6aa8ff", items: 2 },
    ];
    return (
      <div style={{ ...col, width: 350, gap: 10 }}>
        {tiers.map((tier) => (
          <div key={tier.letter} style={{ ...row, height: 68, borderRadius: 14, background: p.panel, border: `2px solid ${p.line}`, overflow: "hidden" }}>
            <div style={{ ...row, justifyContent: "center", width: 68, height: 68, fontSize: 38, fontWeight: 800, color: "#16161c", background: tier.color }}>
              {tier.letter}
            </div>
            <div style={{ ...row, gap: 8, paddingLeft: 12 }}>
              {Array.from({ length: tier.items }, (_, i) => (
                <div key={i} style={{ display: "flex", width: 50, height: 44, borderRadius: 9, background: p.line }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  },
  freezeframes: (p) => {
    const holes = (
      <div style={{ ...col, justifyContent: "space-around", width: 38, height: 420, alignItems: "center" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} style={{ display: "flex", width: 18, height: 24, borderRadius: 5, background: p.bg }} />
        ))}
      </div>
    );
    return (
      <div style={{ ...row, width: 340, height: 420, borderRadius: 18, background: p.line, transform: "rotate(4deg)" }}>
        {holes}
        <div style={{ ...col, flex: 1, gap: 12, height: 420, justifyContent: "center" }}>
          {["#5b21b6", "#a855f7", "#7e22ce"].map((color, i) => (
            <div
              key={color}
              style={{ ...row, justifyContent: "center", height: 122, borderRadius: 10, fontSize: 64, fontWeight: 800, color: "#ffffff", background: color }}
            >
              {i === 1 ? "?" : ""}
            </div>
          ))}
        </div>
        {holes}
      </div>
    );
  },
  "ball-knowledge": (p) => (
    <div style={{ ...col, alignItems: "center", width: 340 }}>
      <div
        style={{ ...col, alignItems: "center", justifyContent: "center", width: 230, height: 230, borderRadius: 115, border: `14px solid ${p.accent}`, background: p.panel }}
      >
        <div style={{ display: "flex", fontSize: 104, fontWeight: 800, color: p.text, lineHeight: 1 }}>60</div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: p.dim }}>seconds</div>
      </div>
      <div style={{ ...row, flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 26 }}>
        {[130, 96, 150, 110, 84].map((width, i) => (
          <div key={i} style={{ display: "flex", width, height: 40, borderRadius: 20, background: i < 4 ? p.brand : p.line }} />
        ))}
      </div>
    </div>
  ),
  "getting-warmer": () => {
    const bars = ["#3b82f6", "#22b8cf", "#f5c542", "#ff9f1a", "#ff6b1a", "#ff3b1a"];
    return (
      <div style={{ ...row, alignItems: "flex-end", width: 340, height: 400, gap: 14 }}>
        {bars.map((color, i) => (
          <div key={color} style={{ display: "flex", width: 45, height: 90 + i * 62, borderRadius: 12, background: color }} />
        ))}
      </div>
    );
  },
  "draft-anything": (p) => (
    <div style={{ display: "flex", position: "relative", width: 340, height: 400 }}>
      {/* The middle card is drawn last so it sits on top of the other two. */}
      {[0, 2, 1].map((i) => (
        <div
          key={i}
          style={{
            ...col,
            position: "absolute",
            left: 12 + i * 70,
            top: 60 + (i === 1 ? -26 : 0),
            width: 176,
            height: 260,
            padding: 18,
            borderRadius: 20,
            background: p.panel,
            border: `3px solid ${i === 1 ? p.accent : p.line}`,
            transform: `rotate(${(i - 1) * 12}deg)`,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 2, color: p.accent }}>PICK {i + 1}</div>
          <div style={{ display: "flex", width: 110, height: 16, borderRadius: 8, background: p.line, marginTop: 20 }} />
          <div style={{ display: "flex", width: 76, height: 16, borderRadius: 8, background: p.line, marginTop: 12 }} />
        </div>
      ))}
    </div>
  ),
  "slippery-slope": (p) => (
    <div style={{ ...row, alignItems: "flex-end", width: 340, height: 400 }}>
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} style={{ ...col, alignItems: "center", width: 68 }}>
          {step === 4 && <div style={{ display: "flex", width: 44, height: 44, borderRadius: 22, background: p.accent, marginBottom: 10 }} />}
          <div
            style={{ display: "flex", width: 68, height: step * 66, background: step <= 4 ? p.line : p.panel, borderTop: `6px solid ${step <= 4 ? p.accent : p.line}` }}
          />
        </div>
      ))}
    </div>
  ),
};

interface Copy {
  label: string;
  first: string;
  second: string;
  line: string;
  address: string;
}

function copyFor(id: ShareImageId): Copy {
  if (id === "home") {
    return {
      label: "Free daily games",
      first: "Stim ",
      second: "Games",
      line: "New puzzles every day. No sign-up.",
      address: "stimgames.com",
    };
  }
  const game = getGame(id);
  return {
    label: game.kind === "daily" ? `Daily ${game.category.toLowerCase()} game` : "Party game",
    first: game.brand.first,
    second: game.brand.second,
    line: game.blurb,
    address: `stimgames.com${game.canonicalPath}`,
  };
}

let assets: Promise<{ medium: Buffer; heavy: Buffer; badge: string }> | undefined;

function loadAssets() {
  assets ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Outfit-500.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Outfit-800.ttf")),
    readFile(join(process.cwd(), "public/stimlabs_badge_v5.svg")),
  ]).then(([medium, heavy, badge]) => ({
    medium,
    heavy,
    badge: `data:image/svg+xml;base64,${badge.toString("base64")}`,
  }));
  return assets;
}

/** The image a link to the site unfurls with in chat apps and on social sites. */
export async function createShareImage(id: ShareImageId): Promise<ImageResponse> {
  const { medium, heavy, badge } = await loadAssets();
  const p = PALETTES[id];
  const copy = copyFor(id);
  const name = copy.first + copy.second;
  // Long names shrink to stay on one line beside the picture.
  const titleSize = Math.min(118, Math.floor(690 / (name.length * 0.56)));

  return new ImageResponse(
    (
      <div style={{ ...row, width: "100%", height: "100%", padding: "56px 64px", background: p.bg, color: p.text, fontFamily: "Outfit" }}>
        <div style={{ ...col, flex: 1, height: "100%", justifyContent: "space-between" }}>
          <div style={{ ...row, gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badge} width={40} height={46} alt="" />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 3, color: p.dim }}>STIM GAMES</div>
          </div>

          <div style={col}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: p.accent }}>
              {copy.label}
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: titleSize, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>
              <span style={{ whiteSpace: "pre" }}>{copy.first}</span>
              <span style={{ color: p.brand }}>{copy.second}</span>
            </div>
            <div style={{ display: "flex", marginTop: 20, maxWidth: 660, fontSize: 38, fontWeight: 500, lineHeight: 1.25, color: p.dim }}>
              {copy.line}
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: p.text }}>{copy.address}</div>
        </div>

        <div style={{ ...row, justifyContent: "center", width: 380, height: "100%" }}>{MOTIFS[id](p)}</div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: "Outfit", data: medium, weight: 500, style: "normal" },
        { name: "Outfit", data: heavy, weight: 800, style: "normal" },
      ],
    },
  );
}
