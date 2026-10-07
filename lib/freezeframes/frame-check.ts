import "server-only";

import { z } from "zod/v4";
import { getGeminiClient, getGeminiModel } from "@/features/ai/gemini";
import type { RoundKey } from "./types";

const FrameVerdictSchema = z.object({
  /** A clear, recognisable image of the right subject. */
  usable: z.boolean(),
  /** Text or a logo in the image gives the answer away. */
  shows_answer: z.boolean(),
  reason: z.string(),
});

export type FrameVerdict = z.infer<typeof FrameVerdictSchema>;

export function buildFramePrompt(options: {
  roundKey: RoundKey;
  answer: string;
  albumName?: string | null;
}): string {
  const { roundKey, answer, albumName } = options;

  if (roundKey === "album") {
    return [
      `You are reviewing an image for a guessing game. It should be the front cover of the album "${albumName ?? "unknown"}" by ${answer}.`,
      `The player sees the cover and must name the ARTIST, so the answer is "${answer}".`,
      `Set shows_answer to true if the artist's name ("${answer}") is legible anywhere on the cover. The album title appearing on the cover is fine.`,
      `Set usable to false if this is not an album cover, or is too small or blurry to recognise.`,
      `Return JSON: { "usable": boolean, "shows_answer": boolean, "reason": string }`,
    ].join("\n");
  }

  const kind = roundKey === "movie" ? "movie" : "TV show";
  return [
    `You are reviewing an image for a guessing game. It should be a still frame from the ${kind} "${answer}".`,
    `The player sees the frame and must name the ${kind}, so the answer is "${answer}".`,
    `Set shows_answer to true if the title "${answer}" (or a clear part of it, or its logo) is legible in the image, or if the image is a poster, title card, or promotional artwork with text.`,
    `Set usable to false if the frame is a blank, near-black, or blurry shot, shows only credits or text, or shows nothing a viewer could recognise the ${kind} from (for example an empty landscape with no characters). A frame with recognisable characters or an iconic scene is usable.`,
    `Return JSON: { "usable": boolean, "shows_answer": boolean, "reason": string }`,
  ].join("\n");
}

/** A frame can be shown when it is recognisable and does not spell out the answer. */
export function frameUsable(verdict: FrameVerdict): boolean {
  return verdict.usable && !verdict.shows_answer;
}

export async function checkFrame(options: {
  imageUrl: string;
  roundKey: RoundKey;
  answer: string;
  albumName?: string | null;
}): Promise<FrameVerdict> {
  const res = await fetch(options.imageUrl, { headers: { Accept: "image/*" } });
  if (!res.ok) return { usable: false, shows_answer: false, reason: `Could not fetch image (${res.status})` };

  const response = await getGeminiClient().models.generateContent({
    model: getGeminiModel(),
    contents: [
      {
        role: "user",
        parts: [
          { text: buildFramePrompt(options) },
          {
            inlineData: {
              mimeType: res.headers.get("content-type") ?? "image/jpeg",
              data: Buffer.from(await res.arrayBuffer()).toString("base64"),
            },
          },
        ],
      },
    ],
    config: { responseMimeType: "application/json", maxOutputTokens: 512 },
  });

  const raw = response.text;
  if (!raw) throw new Error("Empty frame check response");
  return FrameVerdictSchema.parse(JSON.parse(raw));
}
