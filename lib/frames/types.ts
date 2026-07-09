export type RoundKey = "movie" | "song" | "show" | "album";

export type MediaType = "image" | "song" | "album";

export interface RoundConfig {
  key: RoundKey;
  icon: string;
  title: string;
  guessLabel: string;
  placeholder: string;
  mediaType: MediaType;
}

export interface MovieRound {
  img: string;
  hint?: string;
}

export interface SongRound {
  audio: string;
  artist: string;
  hint?: string;
}

export interface ShowRound {
  img: string;
  hint?: string;
}

export interface AlbumRound {
  img: string;
  hint?: string;
  albumName?: string;
}

export type RoundMedia = MovieRound | SongRound | ShowRound | AlbumRound;

export interface DailyPuzzleClient {
  date: string;
  rounds: Record<RoundKey, RoundMedia>;
}

export interface GuessHistoryRow {
  text: string;
  correct: boolean;
  skip?: boolean;
}

export interface DailyPlayed {
  score: number;
  max: number;
  ts: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
  ts: number;
}
