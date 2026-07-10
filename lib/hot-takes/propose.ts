import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { HOT_TAKES_ITEM_COUNT } from "./types";

const ProposalSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string().min(1),
      label: z.string().min(1),
      wiki_title: z.string().min(1),
      notes: z.string().nullable().optional(),
    }),
  ),
});

export interface ProposedItem {
  slug: string;
  label: string;
  wiki_title: string;
  notes?: string | null;
}

export async function proposeCategoryItemsWithLlm(
  categoryName: string,
): Promise<ProposedItem[]> {
  const result = await generateJson({
    schema: ProposalSchema,
    schemaName: "HotTakesCategoryProposal",
    systemPrompt: [
      `You propose exactly ${HOT_TAKES_ITEM_COUNT} tier-list items for a daily ranking game called Hot Takes.`,
      "Items should be recognizable, debatable, and fun to rank S through D.",
      "Prefer Wikipedia article titles that have strong lead photos.",
      "Use lowercase slug ids with hyphens (e.g. pepperoni, bell-pepper).",
      "No duplicates, no vague entries, no 'other' catch-alls.",
      "Mix obvious picks with a few spicy/controversial choices when appropriate.",
    ].join(" "),
    userPrompt: JSON.stringify({ categoryName }, null, 2),
    maxOutputTokens: 4096,
  });

  if (result.items.length !== HOT_TAKES_ITEM_COUNT) {
    throw new Error(
      `Expected ${HOT_TAKES_ITEM_COUNT} items, got ${result.items.length}`,
    );
  }

  return result.items;
}
