import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { clueLeaksAnswer } from "./text-clue";

export interface SongForClue {
  title: string;
  artist: string;
}

const CluesSchema = z.object({
  clues: z.array(z.object({ title: z.string(), clue: z.string() })),
});

const SYSTEM_PROMPT = [
  "You write clues for a music guessing game. For players who cannot play audio, a written clue replaces a 20-second clip of a song. The player already sees the artist's name and must type the song's title.",
  "For each song, write ONE sentence of at most 20 words that lets someone who knows the song identify it: when it came out, its style, what it is about, or what it is famous for.",
  "Rules:",
  "- Never use any word from the song's title, or a different form of one (no 'dance' for 'Dancing Queen').",
  "- Do not quote the lyrics.",
  "- Do not name the artist; the player already has it.",
  "- Keep it factual and family-friendly.",
  "Return one clue per song, repeating the title exactly as given.",
].join("\n");

/**
 * Written clues for a batch of songs, keyed by title. A clue that uses a
 * word from its title is dropped, so a song may come back without one.
 */
export async function generateTextClues(songs: readonly SongForClue[]): Promise<Map<string, string>> {
  const result = await generateJson({
    schema: CluesSchema,
    schemaName: "FreezeFramesTextClues",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: songs.map((song) => `${song.title} — ${song.artist}`).join("\n"),
    maxOutputTokens: 4096,
    timeoutMs: 90_000,
  });

  const asked = new Map(songs.map((song) => [song.title.toLowerCase(), song.title]));
  const clues = new Map<string, string>();
  for (const { title, clue } of result.clues) {
    const original = asked.get(title.trim().toLowerCase());
    if (!original || clues.has(original)) continue;
    if (clueLeaksAnswer(clue, original)) continue;
    clues.set(original, clue.trim());
  }
  return clues;
}
