import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import type { BotProfile } from "./roster";

/** The AI service refuses deadlines shorter than 10 seconds. */
export const DOME_PICK_TIMEOUT_MS = 10_000;
const MAX_NAME_LENGTH = 200;

export interface DomePickInput {
  topic: string;
  bot: BotProfile;
  /** Every pick already made in the draft, by anyone. */
  takenNames: string[];
  ownLineup: string[];
  /** Names the room has vetoed in this draft. */
  vetoedNames: string[];
}

export type DomePickResult =
  | { kind: "pick"; name: string }
  | { kind: "forfeit"; reason: "ai_error" | "all_taken" };

const domePickSchema = z.object({
  candidates: z.array(z.string()).min(1).max(5),
});

const normalize = (name: string): string => name.trim().toLowerCase();

/** The first candidate that is a usable name nobody has taken or vetoed. */
export function firstUsableCandidate(
  candidates: string[],
  taken: string[],
  vetoed: string[],
): string | null {
  const blocked = new Set([...taken, ...vetoed].map(normalize));

  for (const candidate of candidates) {
    const name = candidate.trim();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH) continue;
    if (blocked.has(normalize(name))) continue;
    return name;
  }

  return null;
}

const list = (names: string[]): string =>
  names.length > 0 ? names.map((n) => `- ${n}`).join("\n") : "(none)";

export function buildDomePickPrompt(input: DomePickInput): {
  system: string;
  user: string;
} {
  return {
    system: [
      "You are a player in a party drafting game. Players take turns naming one thing that fits the topic; nobody may repeat a name.",
      input.bot.domePersona,
      "Reply with exactly three different candidates, your favourite first.",
      "Each candidate is the plain name of one real thing that clearly fits the topic: no numbering, no explanation, no quotation marks.",
      "Never offer a name from the already-taken list or the vetoed list, or a different spelling of one.",
    ].join("\n"),
    user: [
      `Topic: ${input.topic}`,
      "",
      "Already taken:",
      list(input.takenNames),
      "",
      "Your lineup so far:",
      list(input.ownLineup),
      "",
      "Vetoed by the room (do not pick):",
      list(input.vetoedNames),
    ].join("\n"),
  };
}

/**
 * Asks the AI for this drafter's pick. Never throws: a failed or unusable
 * answer is a forfeit, so a draft cannot hang on an AI drafter.
 */
export async function pickOffTheDome(input: DomePickInput): Promise<DomePickResult> {
  const prompt = buildDomePickPrompt(input);

  let candidates: string[];
  try {
    const output = await generateJson({
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      schema: domePickSchema,
      schemaName: "bot_dome_pick",
      maxOutputTokens: 1024,
      timeoutMs: DOME_PICK_TIMEOUT_MS,
    });
    candidates = output.candidates;
  } catch (e) {
    console.error("[bots] off-the-dome pick failed:", e);
    return { kind: "forfeit", reason: "ai_error" };
  }

  const name = firstUsableCandidate(candidates, input.takenNames, input.vetoedNames);
  return name ? { kind: "pick", name } : { kind: "forfeit", reason: "all_taken" };
}
