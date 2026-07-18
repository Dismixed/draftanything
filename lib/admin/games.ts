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
    id: "hot-takes",
    name: "Hot Takes",
    playHref: "/hot-takes",
    adminHref: "/admin/hot-takes",
    description: "Category curation, item icons, and daily tier-list scheduling.",
    accent: "#ff3b3b",
  },
  {
    id: "chainlink",
    name: "Chain Link",
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
    id: "freezeframes",
    name: "FreezeFrames",
    playHref: "/freezeframes/daily",
    adminHref: "/admin/freezeframes",
    description: "Seed sourcing, puzzle bundling, and daily scheduling for movie/song/show/album rounds.",
    accent: "#a855f7",
  },
  {
    id: "getting-warmer",
    name: "Getting Warmer",
    playHref: "/getting-warmer/daily",
    adminHref: "/admin/getting-warmer",
    description: "Daily word puzzles with clue chains and AI-generated hints.",
    accent: "#ff6b1a",
  },
];

export function getAdminGame(id: string): AdminGame | undefined {
  return ADMIN_GAMES.find((g) => g.id === id);
}
