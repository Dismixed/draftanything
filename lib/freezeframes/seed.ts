import type { RoundKey } from "./types";

export interface FreezeFramesSeedItem {
  round_key: RoundKey;
  query_title: string;
  notes?: string;
}

/** Starter catalog — import via admin to populate the seed queue. */
export const FREEZEFRAMES_SEED: FreezeFramesSeedItem[] = [
  { round_key: "movie", query_title: "Inception" },
  { round_key: "movie", query_title: "The Godfather" },
  { round_key: "movie", query_title: "Parasite" },
  { round_key: "movie", query_title: "Good Will Hunting" },
  { round_key: "movie", query_title: "The Matrix" },
  { round_key: "song", query_title: "Bohemian Rhapsody Queen" },
  { round_key: "song", query_title: "Billie Jean Michael Jackson" },
  { round_key: "song", query_title: "Blinding Lights The Weeknd" },
  { round_key: "song", query_title: "Maple Leaf Rag Scott Joplin" },
  { round_key: "song", query_title: "Smells Like Teen Spirit Nirvana" },
  { round_key: "show", query_title: "Breaking Bad" },
  { round_key: "show", query_title: "Severance" },
  { round_key: "show", query_title: "The Office" },
  { round_key: "show", query_title: "Succession" },
  { round_key: "show", query_title: "Stranger Things" },
  { round_key: "album", query_title: "The Dark Side of the Moon Pink Floyd" },
  { round_key: "album", query_title: "Abbey Road The Beatles" },
  { round_key: "album", query_title: "OK Computer Radiohead" },
  { round_key: "album", query_title: "Thriller Michael Jackson" },
  { round_key: "album", query_title: "Rumours Fleetwood Mac" },
];
