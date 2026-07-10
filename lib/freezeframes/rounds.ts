import type { RoundConfig } from "./types";

export const ROUNDS: RoundConfig[] = [
  {
    key: "movie",
    icon: "🎬",
    title: "Name the Movie",
    guessLabel: "Movie title",
    placeholder: "e.g. The Godfather",
    mediaType: "image",
  },
  {
    key: "song",
    icon: "🎵",
    title: "Name the Song",
    guessLabel: "Song title",
    placeholder: "e.g. Bohemian Rhapsody",
    mediaType: "song",
  },
  {
    key: "show",
    icon: "📺",
    title: "Name the TV Show",
    guessLabel: "Show title",
    placeholder: "e.g. Breaking Bad",
    mediaType: "image",
  },
  {
    key: "album",
    icon: "💿",
    title: "Name the Artist",
    guessLabel: "Artist name",
    placeholder: "e.g. The Beatles",
    mediaType: "album",
  },
];
