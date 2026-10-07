import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { FUN_FACT_MAX_LENGTH, type SeedEntryRow } from "./seed-types";

/** What the fact should be about, by clue type: the thing the player saw, not the country. */
const FACT_SUBJECT: Record<string, string> = {
  flag: "the design or history of this country's national flag",
  landmark: "the place named in the clue",
  environment: "the place named in the clue",
  person: "the person named in the clue",
  food: "the food named in the clue: where it comes from or how it is made or eaten",
  brand: "the company or brand named in the clue",
  wildlife: "the animal named in the clue",
  written_language: "the language of the text sample, or its script",
};

const FactSchema = z.object({ fun_fact: z.string().nullable() });

/** The subject a fact is about, as shown to a reviewer. */
export function factSubject(entry: Pick<SeedEntryRow, "clue_type" | "wiki_title" | "text_content">): string | null {
  if (entry.clue_type === "flag") return "national flag";
  return (entry.clue_type === "written_language" ? entry.text_content : entry.wiki_title)?.trim() || null;
}

/**
 * Drafts a fact about one clue's subject. The draft is unreviewed: it reaches players only after a
 * person approves it on the clue review page. Returns null when the model is unsure.
 */
export async function proposeFunFact(
  entry: Pick<SeedEntryRow, "clue_type" | "wiki_title" | "text_content" | "country_common">,
): Promise<string | null> {
  const subject = factSubject(entry);
  const about = FACT_SUBJECT[entry.clue_type];
  if (!subject || !about) return null;

  const result = await generateJson({
    schema: FactSchema,
    schemaName: "AnyGuessrFunFact",
    systemPrompt: [
      "You write one fun fact for a geography guessing game, shown after the player has guessed the country.",
      `The fact is about ${about}.`,
      `Write exactly one sentence of at most ${FUN_FACT_MAX_LENGTH - 80} characters, in plain language.`,
      "It must be about the subject itself, not a general fact about the country.",
      "State only what you are certain is true and long-standing: no current records, rankings, prices or population figures.",
      "Return null for fun_fact when you are not sure of a good, true fact.",
    ].join(" "),
    userPrompt: JSON.stringify({ country: entry.country_common, clue_type: entry.clue_type, subject }, null, 2),
    maxOutputTokens: 512,
  });

  const fact = result.fun_fact?.trim();
  if (!fact) return null;
  return fact.length <= FUN_FACT_MAX_LENGTH ? fact : null;
}
