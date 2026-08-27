import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { HOT_TAKES_ITEM_COUNT, SUBJECT_TYPES, type SubjectType } from "./types";

export const ItemProposalSchema = z.object({
  slug: z.string().min(1),
  label: z.string().min(1),
  wiki_title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  subject_type: z.enum(SUBJECT_TYPES),
  photo_query: z.string().min(1),
});

export const ProposalSchema = z.object({
  items: z.array(ItemProposalSchema),
});

export const CategoryProposalSchema = z.object({
  name: z.string().min(1),
  items: z.array(ItemProposalSchema),
});

export interface ProposedItem {
  slug: string;
  label: string;
  wiki_title?: string | null;
  notes?: string | null;
  subject_type: SubjectType;
  photo_query: string;
}

export interface ProposedCategory {
  name: string;
  items: ProposedItem[];
}

const ITEM_RULES = [
  "Items should be recognizable, debatable, and fun to rank S through D.",
  "Classify each item's subject_type: use 'real_entity' for a named, findable entity that has its own Wikipedia article (e.g. a person, place, film, brand, or other notable thing), and 'generic' for an abstract concept or activity without a dedicated article (e.g. 'meeting type', 'first date idea').",
  "For real_entity items set wiki_title to the exact Wikipedia article title; for generic items set wiki_title to null.",
  "Set photo_query to the best Wikimedia Commons search string for the item (this may equal wiki_title or label).",
  "Prefer Wikipedia article titles that have strong lead photos.",
  "Use lowercase slug ids with hyphens (e.g. he-man, dark-knight).",
  "No duplicates, no vague entries, no 'other' catch-alls.",
  "Mix obvious picks with a few spicy/controversial choices when appropriate.",
].join(" ");

function assertItemCount(items: unknown[]): void {
  if (items.length !== HOT_TAKES_ITEM_COUNT) {
    throw new Error(
      `Expected ${HOT_TAKES_ITEM_COUNT} items, got ${items.length}`,
    );
  }
}

export async function proposeCategoryItemsWithLlm(
  categoryName: string,
): Promise<ProposedItem[]> {
  const result = await generateJson({
    schema: ProposalSchema,
    schemaName: "HotTakesCategoryProposal",
    systemPrompt: [
      `You propose exactly ${HOT_TAKES_ITEM_COUNT} tier-list items for a daily ranking game called Hot Takes.`,
      ITEM_RULES,
    ].join(" "),
    userPrompt: JSON.stringify({ categoryName }, null, 2),
    maxOutputTokens: 4096,
  });

  assertItemCount(result.items);
  return result.items;
}

export async function proposeCategoryWithLlm(): Promise<ProposedCategory> {
  const result = await generateJson({
    schema: CategoryProposalSchema,
    schemaName: "HotTakesFullCategoryProposal",
    systemPrompt: [
      `You invent a brand-new category for a daily ranking game called Hot Takes.`,
      "Pick a fun, debatable category name and vary the domain widely — movies, TV, music, sports, video games, celebrities, travel destinations, tech, hobbies, fashion, and more. Avoid defaulting to food or snacks.",
      "Prefer categories about recognizable real-world things that have findable photos.",
      "Keep the category name short and punchy (2-4 words).",
      `Then propose exactly ${HOT_TAKES_ITEM_COUNT} tier-list items for that category.`,
      ITEM_RULES,
    ].join(" "),
    userPrompt: JSON.stringify({ game: "Hot Takes" }, null, 2),
    maxOutputTokens: 4096,
  });

  assertItemCount(result.items);
  return result;
}
