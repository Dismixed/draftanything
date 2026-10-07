import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { quoteInArticle, shapeIssue, timeRelativeWords, unsupportedNumbers } from "./fun-fact-checks";
import { articleTitlesFor, wikiArticleUrl } from "./wiki-article";
import type { SeedEntryRow } from "./seed-types";

/** What the fact should be about, by clue type: the thing the player saw, not the country. */
const FACT_ABOUT: Record<string, string> = {
  flag: "the design or history of this country's current national flag, not a historical flag",
  landmark: "the place named in the clue",
  environment: "the place named in the clue",
  person: "the person named in the clue",
  food: "the food named in the clue: where it comes from, or how it is made or eaten",
  brand: "the company or brand named in the clue",
  wildlife: "the animal named in the clue",
  written_language: "the language of the text sample, or its script",
};

export type JudgeVerdict = "supported" | "partly_supported" | "unsupported" | "off_topic";

export interface FactRecord {
  id: string;
  cca3: string;
  country: string;
  clue_type: string;
  subject: string | null;
  source_title: string | null;
  source_url: string | null;
  fun_fact: string | null;
  /** The sentence from the article that states the fact, copied exactly. */
  evidence: string | null;
  checks: {
    article: boolean;
    quote: boolean | null;
    numbers: boolean | null;
    timeless: boolean | null;
    shape: boolean | null;
    judge: JudgeVerdict | null;
  };
  verdict: "verified" | "rejected" | "no_source";
  reason: string | null;
}

/** The clue's subject in words, for the judge. */
export function subjectLabel(entry: Pick<FactEntry, "clue_type" | "country_common" | "wiki_title" | "text_content">): string {
  if (entry.clue_type === "flag") return `the current national flag of ${entry.country_common}`;
  if (entry.clue_type === "written_language") return `the language of the text "${entry.text_content ?? ""}"`;
  return entry.wiki_title ?? entry.clue_type;
}

export type FactEntry = Pick<
  SeedEntryRow,
  "id" | "cca3" | "country_common" | "clue_type" | "wiki_title" | "text_content" | "notes"
>;

export interface Draft {
  fun_fact: string;
  evidence: string;
}

export interface SourcingDeps {
  /** The article's prose, or null when there is no such article. */
  getArticle: (title: string) => Promise<string | null>;
  draft: (input: DraftInput) => Promise<Draft | null>;
  judge: (input: JudgeInput) => Promise<JudgeVerdict>;
}

export interface JudgeInput {
  fact: string;
  evidence: string;
  /** What the clue shows, in words, e.g. "the current national flag of Brazil". */
  subject: string;
}

export interface DraftInput {
  country: string;
  clueType: string;
  subject: string;
  article: string;
  /** Facts already used from this article, so countries sharing one do not repeat. */
  avoid: readonly string[];
  /** What was wrong with the previous attempt, if there was one. */
  feedback?: string;
}

const DraftSchema = z.object({ fun_fact: z.string().nullable(), evidence: z.string().nullable() });
const JudgeSchema = z.object({
  verdict: z.enum(["supported", "partly_supported", "unsupported", "off_topic"]),
  reason: z.string(),
});

export async function draftFromArticle(input: DraftInput): Promise<Draft | null> {
  const about = FACT_ABOUT[input.clueType];
  if (!about) return null;

  const result = await generateJson({
    schema: DraftSchema,
    schemaName: "AnyGuessrSourcedFact",
    systemPrompt: [
      "You write one fun fact for a geography guessing game, shown after the player has guessed the country.",
      "Use only what the Wikipedia article text states. Do not add anything from memory.",
      `The fact is about ${about}. Choose something memorable that a general reader would enjoy.`,
      "Write fun_fact as one plain sentence of at most 200 characters, in your own words.",
      "Write evidence as the single sentence from the article that states the fact, copied exactly, character for character.",
      "Never use 'currently', 'today', 'as of' or similar. Avoid rankings and figures that change over time.",
      "Return null for both fields if the article has no suitable fact.",
    ].join(" "),
    userPrompt: JSON.stringify(
      {
        country: input.country,
        subject: input.subject,
        facts_already_used: input.avoid,
        ...(input.feedback ? { previous_attempt_problem: input.feedback } : {}),
        article: input.article,
      },
      null,
      2,
    ),
    maxOutputTokens: 2048,
  });

  const fun_fact = result.fun_fact?.trim();
  const evidence = result.evidence?.trim();
  return fun_fact && evidence ? { fun_fact, evidence } : null;
}

/** A second, independent read. It sees the claim, the quote and the subject, never the article. */
export async function judgeAgainstEvidence(input: JudgeInput): Promise<JudgeVerdict> {
  const result = await generateJson({
    schema: JudgeSchema,
    schemaName: "AnyGuessrFactCheck",
    systemPrompt: [
      "You check claims against a quote from a source.",
      "'off_topic': the claim is not about the subject, for example it is about a different thing that shares its article.",
      "'supported': the claim is about the subject and the quote by itself establishes everything the claim says, including every name, number, date and comparison.",
      "'partly_supported': the claim says something the quote does not, even if small.",
      "'unsupported': the quote does not establish the claim.",
      "Be strict. Give a one-sentence reason.",
    ].join(" "),
    userPrompt: JSON.stringify({ subject: input.subject, claim: input.fact, quote: input.evidence }, null, 2),
    maxOutputTokens: 1024,
  });
  return result.verdict;
}

export const defaultSourcingDeps = {
  draft: draftFromArticle,
  judge: judgeAgainstEvidence,
} satisfies Pick<SourcingDeps, "draft" | "judge">;

const ATTEMPTS = 2;

/**
 * Drafts a fact from a real article and checks it. A fact comes back "verified" only when its
 * supporting sentence is in the article word for word, it adds no numbers of its own, it is not
 * time-relative, and an independent reader finds the sentence establishes it. A person still
 * approves it before players see it.
 */
export async function sourceFunFact(
  entry: FactEntry,
  deps: SourcingDeps,
  avoid: readonly string[] = [],
): Promise<FactRecord> {
  const record: FactRecord = {
    id: entry.id,
    cca3: entry.cca3,
    country: entry.country_common,
    clue_type: entry.clue_type,
    subject: entry.clue_type === "written_language" ? entry.text_content : entry.wiki_title,
    source_title: null,
    source_url: null,
    fun_fact: null,
    evidence: null,
    checks: { article: false, quote: null, numbers: null, timeless: null, shape: null, judge: null },
    verdict: "no_source",
    reason: null,
  };

  let article: string | null = null;
  for (const title of articleTitlesFor(entry)) {
    const text = await deps.getArticle(title);
    if (text && text.length > 200) {
      article = text;
      record.source_title = title;
      record.source_url = wikiArticleUrl(title);
      break;
    }
  }
  if (!article) {
    record.reason = "no Wikipedia article found";
    return record;
  }
  record.checks.article = true;
  record.verdict = "rejected";

  let feedback: string | undefined;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const draft = await deps.draft({
      country: entry.country_common,
      clueType: entry.clue_type,
      subject: record.subject ?? entry.clue_type,
      article,
      avoid,
      feedback,
    });
    if (!draft) {
      record.reason = "the article has no suitable fact";
      return record;
    }

    record.fun_fact = draft.fun_fact;
    record.evidence = draft.evidence;

    const quote = quoteInArticle(draft.evidence, article);
    const extraNumbers = unsupportedNumbers(draft.fun_fact, draft.evidence);
    const timeWord = timeRelativeWords(draft.fun_fact);
    const shape = shapeIssue(draft.fun_fact);
    record.checks = {
      article: true,
      quote,
      numbers: extraNumbers.length === 0,
      timeless: timeWord === null,
      shape: shape === null,
      judge: null,
    };

    const problem = !quote
      ? "the evidence is not a sentence copied exactly from the article"
      : extraNumbers.length > 0
        ? `the fact states ${extraNumbers.join(", ")}, which the evidence does not`
        : timeWord
          ? `the fact says "${timeWord}", which goes out of date`
          : shape
            ? `the fact is ${shape}`
            : null;
    if (problem) {
      record.reason = problem;
      feedback = problem;
      continue;
    }

    record.checks.judge = await deps.judge({ fact: draft.fun_fact, evidence: draft.evidence, subject: subjectLabel(entry) });
    if (record.checks.judge === "supported") {
      record.verdict = "verified";
      record.reason = null;
      return record;
    }
    if (record.checks.judge === "off_topic") {
      record.reason = "an independent check found the fact is not about the clue's subject";
      feedback = `the fact must be about ${subjectLabel(entry)}, not something else in the article`;
    } else {
      record.reason = `an independent check found the evidence ${record.checks.judge.replace("_", " ")} the fact`;
      feedback = "the quoted sentence does not fully establish the fact; keep to what the sentence says";
    }
  }

  return record;
}
