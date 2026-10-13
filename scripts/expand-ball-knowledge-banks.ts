#!/usr/bin/env tsx
/**
 * scripts/expand-ball-knowledge-banks.ts
 *
 * Asks the LLM for more valid answers per Ball Knowledge category, so more
 * guesses match instantly and the "Missed" tab has more to show.
 *
 *   1. Propose — well-known members of the category that are not on the list
 *   2. Verify  — a second pass drops anything that does not clearly belong
 *                or that repeats an existing answer under another name
 *   3. Dedupe  — drop anything whose spelling clashes with an existing answer
 *   4. Write   — append survivors to lib/ball-knowledge/answer-bank-extras.json
 *
 * By default this only reports. Nothing is written unless you pass `--write`.
 * Review the JSON diff before committing: these are AI suggestions.
 *
 * Usage:
 *   npx tsx scripts/expand-ball-knowledge-banks.ts                        # dry run, all categories
 *   npx tsx scripts/expand-ball-knowledge-banks.ts --write                # + save to the extras file
 *   npx tsx scripts/expand-ball-knowledge-banks.ts --only="Dog Breeds"    # one category
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";
import { z } from "zod/v4";

config({ path: ".env.local" });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const EXTRAS_PATH = "lib/ball-knowledge/answer-bank-extras.json";
const MAX_NEW_PER_CATEGORY = 40;
const CONCURRENCY = 4;

const proposeSchema = z.object({
  answers: z.array(
    z.object({
      name: z.string(),
      aliases: z.array(z.string()),
    }),
  ),
});

const verifySchema = z.object({
  rejected: z.array(z.string()),
});

async function main() {
  const write = process.argv.includes("--write");
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);

  const { generateJson } = await import("../features/ai/gemini");
  const { CATEGORIES } = await import("../lib/ball-knowledge/categories");
  const { getAnswerBank } = await import("../lib/ball-knowledge/answer-banks");
  const { normKey } = await import("../lib/ball-knowledge/normalize");

  const extras = JSON.parse(readFileSync(EXTRAS_PATH, "utf8")) as Record<string, string[]>;
  const categories = CATEGORIES.filter((c) => !only || c === only);
  if (categories.length === 0) throw new Error(`Unknown category: ${only}`);

  async function expand(category: string): Promise<string[]> {
    const bank = getAnswerBank(category)!;
    const existing = bank.map((e) => e.canonical);

    const proposed = await generateJson({
      systemPrompt: `You are building the answer list for a trivia game where players name as many items in a category as they can in 60 seconds.
Given a category and the answers already on the list, add up to ${MAX_NEW_PER_CATEGORY} more answers that a typical player might plausibly type and that are genuinely, unambiguously correct.
- Order them from most to least well known.
- Do not repeat anything already on the list, including under another name or in another language.
- Each answer must deserve its own point. Do not add a more specific variety, sub-type, re-release or re-recording of something already on the list (no "Italian Sausage" when "Sausage" is listed).
- Stay strictly inside the category: individuals not groups when it asks for people, moves not whole dance styles when it asks for moves.
- If the category is a closed set and the list already covers it (for example a league's current teams), return an empty list. Do not pad with obscure, historical or debatable entries.
- "name" is the clean display form. "aliases" are other spellings, nicknames or plurals a player might type; leave it empty if there are none.`,
      userPrompt: `Category: "${category}"\nAlready on the list: ${JSON.stringify(existing)}`,
      schema: proposeSchema,
      schemaName: "ball_knowledge_expand",
      maxOutputTokens: 16_384,
    });

    const candidates = proposed.answers
      .map((a) => ({ name: a.name.trim(), aliases: a.aliases.map((s) => s.trim()).filter(Boolean) }))
      .filter((a) => a.name && a.name.length <= 60 && !a.name.includes("|"))
      .slice(0, MAX_NEW_PER_CATEGORY);
    if (candidates.length === 0) return [];

    const verified = await generateJson({
      systemPrompt: `You are a strict fact checker for a trivia game. Given a category and a list of proposed answers, return in "rejected", exactly as written, every proposed answer that fails any of these:
- It is not clearly and unambiguously a real member of the category, or it is a different kind of thing than the category names (a group when it asks for individuals, a whole style when it asks for moves, a brand when it asks for a type).
- It is the same thing as an existing answer under another name or language, or just a more specific variety, sub-type, re-release or re-recording of an existing answer.
- It is the same thing as an earlier proposed answer.
- People would reasonably argue about whether it counts.
When in doubt, reject. Return an empty list if all are correct.`,
      userPrompt: `Category: "${category}"\nExisting answers: ${JSON.stringify(existing)}\nProposed answers: ${JSON.stringify(candidates.map((c) => c.name))}`,
      schema: verifySchema,
      schemaName: "ball_knowledge_expand_verify",
      maxOutputTokens: 16_384,
    });
    const rejected = new Set(verified.rejected.map((r) => normKey(r)));

    // An alias claimed by two answers would count one answer as the other.
    const taken = new Set(bank.flatMap((e) => [...e.aliases]));
    const lines: string[] = [];
    for (const candidate of candidates) {
      if (rejected.has(normKey(candidate.name))) continue;
      const nameKey = normKey(candidate.name);
      if (!nameKey || taken.has(nameKey)) continue;
      const aliases = candidate.aliases.filter((alias) => {
        const key = normKey(alias);
        return key && key !== nameKey && !taken.has(key) && !alias.includes("|");
      });
      const keys = new Set([nameKey, ...aliases.map((a) => normKey(a))]);
      for (const key of keys) taken.add(key);
      const seen = new Set([nameKey]);
      const uniqueAliases = aliases.filter((a) => {
        const key = normKey(a);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      lines.push([candidate.name, ...uniqueAliases].join("|"));
    }
    return lines;
  }

  let added = 0;
  const queue = [...categories];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let category = queue.shift(); category; category = queue.shift()) {
        try {
          const lines = await expand(category);
          added += lines.length;
          if (lines.length > 0) extras[category] = [...(extras[category] ?? []), ...lines];
          console.log(`${category}: +${lines.length}${lines.length ? `  (${lines.map((l) => l.split("|")[0]).join(", ")})` : ""}`);
        } catch (error) {
          console.error(`${category}: FAILED — ${error instanceof Error ? error.message : error}`);
        }
      }
    }),
  );

  if (write) {
    const ordered = Object.fromEntries(
      CATEGORIES.filter((c) => extras[c]?.length).map((c) => [c, extras[c]]),
    );
    writeFileSync(EXTRAS_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
    console.log(`\nWrote ${added} new answers to ${EXTRAS_PATH}`);
  } else {
    console.log(`\nDry run: ${added} new answers found. Pass --write to save them.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
