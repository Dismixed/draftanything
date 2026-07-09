export interface AdminGame {
  id: string;
  name: string;
  /** Player-facing daily route */
  playHref: string;
  /** Admin tools route — null when not built yet */
  adminHref: string | null;
  description: string;
  accent: string;
}

export const ADMIN_GAMES: AdminGame[] = [
  {
    id: "chainlink",
    name: "Chainlink",
    playHref: "/chainlink/daily",
    adminHref: "/admin/chains",
    description: "Word-chain puzzle queue, generation, and daily scheduling.",
    accent: "#c9b458",
  },
  {
    id: "anyguessr",
    name: "AnyGuessr",
    playHref: "/anyguessr/daily",
    adminHref: "/admin/anyguessr",
    description: "Seed review, image sourcing, aliases, and puzzle generation.",
    accent: "#5bc0de",
  },
  {
    id: "brain-dead",
    name: "Brain Dead",
    playHref: "/brain-dead/daily",
    adminHref: null,
    description: "Trivia question sourcing — admin tools coming soon.",
    accent: "#b565d8",
  },
  {
    id: "slippery-slope",
    name: "Slippery Slope",
    playHref: "/slippery-slope",
    adminHref: null,
    description: "Word ladder content — admin tools coming soon.",
    accent: "#6aaa64",
  },
  {
    id: "frames",
    name: "Frames",
    playHref: "/frames/daily",
    adminHref: null,
    description: "Daily movie, song, show, and album frame puzzles.",
    accent: "#a855f7",
  },
];

export function getAdminGame(id: string): AdminGame | undefined {
  return ADMIN_GAMES.find((g) => g.id === id);
}
