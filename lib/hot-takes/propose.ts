import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { HOT_TAKES_ITEM_COUNT, SUBJECT_TYPES, type SubjectType } from "./types";

export const ProposalSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string().min(1),
      label: z.string().min(1),
      wiki_title: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      subject_type: z.enum(SUBJECT_TYPES),
      photo_query: z.string().min(1),
    }),
  ),
});

export interface ProposedItem {
  slug: string;
  label: string;
  wiki_title?: string | null;
  notes?: string | null;
  subject_type: SubjectType;
  photo_query: string;
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
      "Classify each item's subject_type: use 'real_entity' for a named, findable entity that has its own Wikipedia article (e.g. a food, place, person, brand, or thing), and 'generic' for an abstract concept or activity without a dedicated article (e.g. 'meeting type', 'first date idea').",
      "For real_entity items set wiki_title to the exact Wikipedia article title; for generic items set wiki_title to null.",
      "Set photo_query to the best Wikimedia Commons search string for the item (this may equal wiki_title or label).",
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
