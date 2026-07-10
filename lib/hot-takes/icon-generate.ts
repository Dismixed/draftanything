import "server-only";

import { getGeminiClient } from "@/features/ai/gemini";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ImageCandidate } from "./types";

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "imagen-3.0-generate-002";
const BUCKET = "hot-takes-icons";

function iconPrompt(categoryName: string, label: string): string {
  return [
    `Flat vector app icon for "${label}" in the category "${categoryName}".`,
    "Centered subject, simple recognizable silhouette, bold colors,",
    "dark charcoal background (#1e1e26), no text, no border, no watermark,",
    "game UI asset style, square composition.",
  ].join(" ");
}

export async function generateItemIcon(options: {
  categorySlug: string;
  itemSlug: string;
  categoryName: string;
  label: string;
}): Promise<{ publicUrl: string; candidate: ImageCandidate }> {
  const client = getGeminiClient();

  const response = await client.models.generateImages({
    model: IMAGE_MODEL,
    prompt: iconPrompt(options.categoryName, options.label),
    config: { numberOfImages: 1 },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Image generation returned no bytes");
  }

  const buffer = Buffer.from(imageBytes, "base64");
  const path = `${options.categorySlug}/${options.itemSlug}.png`;

  const db = createAdminClient();
  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const candidate: ImageCandidate = {
    image_url: publicUrl,
    thumb_url: publicUrl,
    source: "generated",
    license: "AI-generated",
  };

  return { publicUrl, candidate };
}
