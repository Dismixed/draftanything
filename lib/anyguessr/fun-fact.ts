import type { SeedEntryRow } from "./seed-types";
import type { Clue } from "./types";

/** What picking a fact needs from a seed entry. */
export type FunFactSource = Pick<
  SeedEntryRow,
  "clue_type" | "wiki_title" | "text_content" | "fun_fact" | "fun_fact_source_url" | "fun_fact_reviewed"
>;

export interface ClueFunFact {
  text: string;
  /** The article the fact comes from, when it has one. */
  sourceUrl: string | null;
}

/** Sources are Wikipedia articles; anything else stored in the column is not shown as a link. */
const WIKIPEDIA_ARTICLE = /^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\/\S+$/;

const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").replace(/_/g, " ").trim().toLowerCase() === (b ?? "").replace(/_/g, " ").trim().toLowerCase();

/**
 * The fact to show once a round is over, or null.
 *
 * A fact is about what the clue shows, so it is shown only when a person has reviewed it and the
 * entry still describes the clue the player was given. A clue replaced since the day's puzzle was
 * built keeps its old subject in the puzzle and must not pick up the new subject's fact.
 */
export function funFactForClue(entry: FunFactSource | null | undefined, clue: Clue | undefined): ClueFunFact | null {
  if (!entry || !clue || entry.clue_type !== clue.type) return null;
  const text = entry.fun_fact?.trim();
  if (!text || !entry.fun_fact_reviewed) return null;

  // A flag has no subject to compare; every flag clue is the country's own flag.
  if (clue.type !== "flag") {
    const subject = clue.type === "written_language" ? entry.text_content : entry.wiki_title;
    if (!same(subject, clue.content)) return null;
  }

  const source = entry.fun_fact_source_url?.trim() ?? "";
  return { text, sourceUrl: WIKIPEDIA_ARTICLE.test(source) ? source : null };
}
