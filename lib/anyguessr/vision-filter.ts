import "server-only";

import { z } from "zod/v4";
import { getGeminiClient, getGeminiModel } from "@/features/ai/gemini";
import { fetchWithRetry } from "./async-pool";
import type { ImageCandidate } from "./seed-types";

const VisionResultSchema = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(1),
  reason: z.string(),
  /** True when writing in the image gives the answer away. */
  shows_country_name: z.boolean().default(false),
});

export type VisionResult = z.infer<typeof VisionResultSchema>;

export function buildVisionPrompt(options: {
  clueType: string;
  country: string;
  wikiTitle?: string | null;
}): string {
  return [
    `You are reviewing candidate images for a geography guessing game.`,
    `Country: ${options.country}`,
    `Clue type: ${options.clueType}`,
    options.wikiTitle ? `Wikipedia article: ${options.wikiTitle}` : "",
    "",
    ...(options.clueType === "brand"
      ? [
          `Does this image clearly show this brand? The brand's logo or a clearly branded product is the ideal image; a storefront or building with the brand's signage is acceptable.`,
          `Reject images that do not show the brand at all, other companies' marks, maps, flags, collages, diagrams, charts, and generic stock photos.`,
        ]
      : [
          `Does this image plausibly depict the clue type for this country?`,
          `Reject maps, flags (unless clue type is flag), collages, logos unrelated to the country,`,
          `diagrams, charts, and generic stock photos.`,
        ]),
    "",
    options.clueType === "flag"
      ? `This is a flag clue, so set shows_country_name to false.`
      : `Players must work out the country from the image, so also check for giveaways. Set shows_country_name to true if any legible text shows the name of the country in any language or script, its adjective or demonym ("Egyptian", "Norge", "ΕΛΛΑΣ"), a company or team name that contains it ("EgyptAir", "Bank of Japan"), or if the national flag is clearly displayed.`,
    `Return JSON: { "pass": boolean, "score": 0-1, "reason": string, "shows_country_name": boolean }`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** An image is usable when it fits the clue and does not spell out the answer. */
export function visionAccepts(vision: VisionResult, minScore: number): boolean {
  return vision.pass && vision.score >= minScore && !vision.shows_country_name;
}

async function fetchImageBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetchWithRetry(url, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    return { mimeType, data };
  } catch {
    return null;
  }
}

export async function scoreImageForClue(options: {
  imageUrl: string;
  clueType: string;
  country: string;
  wikiTitle?: string | null;
}): Promise<VisionResult> {
  const image = await fetchImageBase64(options.imageUrl);
  if (!image) {
    return { pass: false, score: 0, reason: "Could not fetch image bytes", shows_country_name: false };
  }

  const client = getGeminiClient();
  const prompt = buildVisionPrompt(options);

  try {
    const response = await client.models.generateContent({
      model: getGeminiModel(),
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: image.mimeType, data: image.data } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 256,
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("empty vision response");
    const parsed = VisionResultSchema.parse(JSON.parse(raw));
    return parsed;
  } catch (err) {
    return {
      pass: true,
      score: 0.5,
      reason: `Vision check skipped: ${err instanceof Error ? err.message : String(err)}`,
      shows_country_name: false,
    };
  }
}

export async function filterCandidatesWithVision(options: {
  candidates: ImageCandidate[];
  clueType: string;
  country: string;
  wikiTitle?: string | null;
  minScore?: number;
}): Promise<Array<ImageCandidate & { vision: VisionResult }>> {
  const minScore = options.minScore ?? 0.55;
  const results: Array<ImageCandidate & { vision: VisionResult }> = [];

  for (const candidate of options.candidates) {
    const vision = await scoreImageForClue({
      imageUrl: candidate.image_url,
      clueType: options.clueType,
      country: options.country,
      wikiTitle: options.wikiTitle ?? candidate.wiki_title,
    });
    if (visionAccepts(vision, minScore)) {
      results.push({ ...candidate, vision });
    }
  }

  return results.sort((a, b) => b.vision.score - a.vision.score);
}
