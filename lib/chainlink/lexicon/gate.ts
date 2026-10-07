import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";

export const LINK_CATEGORIES = [
  "food",
  "animals",
  "sports",
  "nature",
  "home",
  "time",
  "finance",
  "transport",
  "education",
  "music",
  "health",
  "technology",
  "relationships",
  "arts",
  "fashion",
  "general",
] as const;

const VerdictSchema = z.object({
  /** The pair being judged, exactly as given. */
  phrase: z.string(),
  valid: z.boolean(),
  /** 1 = few adults would know it … 5 = everyone knows it. */
  familiarity: z.number().int().min(1).max(5),
  category: z.enum(LINK_CATEGORIES),
});

const GateSchema = z.object({ verdicts: z.array(VerdictSchema) });

export type LinkVerdict = z.infer<typeof VerdictSchema>;

/**
 * The gate runs as a funnel. `screen` is a broad pass over every candidate
 * that throws out non-phrases cheaply; `strict` re-judges the survivors
 * against a dictionary-entry standard.
 */
export type GateStage = "screen" | "strict";

const SHARED_RULES = [
  "Each input is 'first second'. The pair may be written as one word (foot ball = football), two words (hot dog) or hyphenated in real use.",
  "Return one verdict per input, in order, repeating the phrase exactly as given.",
];

const SYSTEM_PROMPTS: Record<GateStage, string> = {
  screen: [
    "You vet two-word links for an American English word-chain game. Players see the first word and must type the second, so each link has to be a compound word or set phrase most adults recognise on sight.",
    "Mark valid only when ALL of these hold:",
    "1. The joined or spaced form is an established compound or set phrase, not merely two words that often sit next to each other (reject 'last year', 'bank loans', 'still under').",
    "2. Both halves keep their own standalone meaning inside it. Reject accidental splits of an unrelated word (car pet, sea son, tar get, men tion) and reject a second half that is acting as a suffix (friend ship, child hood, home less, haul age, month ly).",
    "3. Both halves contribute meaning a player could reason from. Reject fused function words (in come, up on, him self, under stand, every thing, in order, per cent). A particle such as up, out, in, off, on, over, under, back or down is fine only in a familiar compound where it keeps its sense (set up, check out, out door, back up, under dog).",
    "4. Neither half is a name, brand, abbreviation or plural/inflected form of a more natural link (reject 'fire places', 'pin pointing').",
    "5. It is family-friendly and not web or tech jargon few people say aloud (reject 'track back', 'private message').",
    ...SHARED_RULES,
  ].join("\n"),
  strict: [
    "You are the final editor of the phrase list for an American English word-chain game. Players see the first word plus the first letter and length of the second, and must type the second. Every pair you are given already passed a loose screen; be strict.",
    "Mark valid only if the pair is LEXICALISED: a compound or fixed expression a dictionary would list as its own entry, or a fixed term everyone uses as a unit (hot dog, blind date, ice cream, credit card, fire place, book worm, back pack, check out, blind spot).",
    "Reject:",
    "- free combinations whose meaning is just the sum of the parts and whose words could be swapped for others (raw meat, cheap flight, small table, old data, white sugar, home video, back home, good time, clean water, seven miles)",
    "- website, software or business jargon (view cart, site stats, main page, previous page, chip set, base name, order form, internet service)",
    "- inflected or derived forms of a simpler link (book marked, back ordered, north eastern, setting up, going off)",
    "- verb + preposition sequences that are not a well-known phrasal verb or noun (read over, pick on, phone in, file under)",
    "- anything adult, crude, or that reads as a name or brand",
    "Rate familiarity honestly for a general adult audience: 5 = a ten-year-old knows it, 4 = nearly every adult knows it, 3 = many adults would hesitate, 2 or 1 = specialist or dated.",
    ...SHARED_RULES,
  ].join("\n"),
};

const normalise = (phrase: string) => phrase.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Keys the model's verdicts by the phrases that were asked about. Phrases
 * the model skipped are left out so the caller can retry them.
 */
export function indexVerdicts(
  phrases: readonly string[],
  verdicts: readonly LinkVerdict[],
): Map<string, LinkVerdict> {
  const asked = new Map<string, string>();
  for (const phrase of phrases) {
    asked.set(phrase, phrase);
    asked.set(phrase.replace(" ", ""), phrase);
  }

  const index = new Map<string, LinkVerdict>();
  for (const verdict of verdicts) {
    const phrase = asked.get(normalise(verdict.phrase));
    if (phrase && !index.has(phrase)) index.set(phrase, { ...verdict, phrase });
  }
  return index;
}

export async function judgeLinks(
  phrases: readonly string[],
  stage: GateStage,
): Promise<Map<string, LinkVerdict>> {
  const result = await generateJson({
    schema: GateSchema,
    schemaName: `ChainlinkLexiconGate-${stage}`,
    systemPrompt: SYSTEM_PROMPTS[stage],
    userPrompt: phrases.join("\n"),
    maxOutputTokens: 16384,
    timeoutMs: 120_000,
  });
  return indexVerdicts(phrases, result.verdicts);
}
