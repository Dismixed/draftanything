export interface GameBrand {
  first: string;
  second: string;
  color: string;
}

export const GAME_BRANDS = {
  chainlink: { first: "Chain", second: "link", color: "#c9b458" },
  anyguessr: { first: "Any", second: "Guessr", color: "var(--ag-brand)" },
  "brain-dead": { first: "Brain ", second: "Dead", color: "var(--bd-primary)" },
  freezeframes: { first: "Freeze", second: "Frames", color: "#a855f7" },
  "ball-knowledge": { first: "Ball ", second: "Knowledge", color: "#5b9ee8" },
  "slippery-slope": { first: "Slippery ", second: "Slope", color: "var(--ss-lime)" },
  "hot-takes": { first: "Hot ", second: "Takes", color: "#ff3b3b" },
  "getting-warmer": { first: "Getting ", second: "Warmer", color: "#ff6b1a" },
} as const satisfies Record<string, GameBrand>;

export type GameBrandId = keyof typeof GAME_BRANDS;
