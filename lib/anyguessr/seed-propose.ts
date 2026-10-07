import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import type { SeedClueType } from "./seed-types";

const ClueTypeEnum = z.enum([
  "brand",
  "landmark",
  "written_language",
  "person",
  "food",
  "environment",
  "wildlife",
]);

const ProposalSchema = z.object({
  entries: z.array(
    z.object({
      clue_type: ClueTypeEnum,
      wiki_title: z.string().nullable(),
      text_content: z.string().nullable(),
      fun_fact: z.string().nullable(),
      notes: z.string().nullable().optional(),
    }),
  ),
});

export interface ProposedSeedEntry {
  clue_type: SeedClueType;
  wiki_title: string | null;
  text_content: string | null;
  fun_fact: string | null;
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
      "For brand pick a company strongly associated with the country, not a global multinational.",
      "For wildlife pick the national animal, an endemic species, or the most iconic wild animal with a strong Wikipedia lead photo.",
      "For every entry also return fun_fact: one sentence of at most 200 characters about the specific thing the clue shows (the landmark, dish, person, brand, animal or language), not the country in general.",
      "Only state a fun_fact you are certain is true; return null when unsure.",
      "Return exactly one entry per clue type.",
    ].join(" "),
    userPrompt: JSON.stringify(options, null, 2),
    maxOutputTokens: 2048,
  });

  return result.entries;
}
