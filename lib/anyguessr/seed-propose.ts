import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";

const ClueTypeEnum = z.enum([
  "currency",
  "jersey",
  "brand",
  "landmark",
  "written_language",
  "person",
  "food",
  "environment",
]);

const ProposalSchema = z.object({
  entries: z.array(
    z.object({
      clue_type: ClueTypeEnum,
      wiki_title: z.string().nullable(),
      text_content: z.string().nullable(),
      notes: z.string().nullable().optional(),
    }),
  ),
});

export interface ProposedSeedEntry {
  clue_type: (typeof SEED_CLUE_TYPES)[number];
  wiki_title: string | null;
  text_content: string | null;
  notes?: string | null;
}

export async function proposeSeedEntriesWithLlm(options: {
  cca3: string;
  country: string;
  region: string;
  capital: string;
}): Promise<ProposedSeedEntry[]> {
  const result = await generateJson({
    schema: ProposalSchema,
    schemaName: "AnyGuessrSeedProposal",
    systemPrompt: [
      "You propose Wikipedia article titles for a geography guessing game.",
      "Each clue type needs a distinct, recognizable, country-specific reference.",
      "Prefer articles with strong lead photos on Wikipedia.",
      "For written_language return a short native script sample or greeting in text_content (not wiki_title).",
      "For currency prefer a banknote/coin article title, not just the currency code.",
      "For jersey use the most iconic national sports kit article (football unless another sport dominates).",
      "For brand pick a company strongly associated with the country, not a global multinational.",
      "Return exactly one entry per clue type.",
    ].join(" "),
    userPrompt: JSON.stringify(options, null, 2),
    maxOutputTokens: 2048,
  });

  return result.entries;
}
