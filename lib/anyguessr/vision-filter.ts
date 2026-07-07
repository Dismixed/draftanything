import "server-only";

import { z } from "zod/v4";
import { getGeminiClient, getGeminiModel } from "@/features/ai/gemini";
import { fetchWithRetry } from "./async-pool";
import type { ImageCandidate } from "./seed-types";

const VisionResultSchema = z.object({
  pass: z.boolean(),
  score: z.number().min(0).max(1),
  reason: z.string(),
});

export type VisionResult = z.infer<typeof VisionResultSchema>;

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
    return { pass: false, score: 0, reason: "Could not fetch image bytes" };
  }

  const client = getGeminiClient();
  const prompt = [
    `You are reviewing candidate images for a geography guessing game.`,
    `Country: ${options.country}`,
    `Clue type: ${options.clueType}`,
    options.wikiTitle ? `Wikipedia article: ${options.wikiTitle}` : "",
    "",
    `Does this image plausibly depict the clue type for this country?`,
    `Reject maps, flags (unless clue type is flag), collages, logos unrelated to the country,`,
    `diagrams, charts, and generic stock photos.`,
    `Return JSON: { "pass": boolean, "score": 0-1, "reason": string }`,
  ]
    .filter(Boolean)
    .join("\n");

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
    if (vision.pass && vision.score >= minScore) {
      results.push({ ...candidate, vision });
    }
  }

  return results.sort((a, b) => b.vision.score - a.vision.score);
}
