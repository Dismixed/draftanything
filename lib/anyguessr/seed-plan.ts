import type { ClueDifficulty } from "./seed-types";

/** One proposed clue from a bulk seeding run. */
export interface ClueProposal {
  cca3: string;
  country: string;
  clue_type: string;
  difficulty: ClueDifficulty;
  note: string;
  /** One sentence about what the clue shows (the dish, the animal), for a reviewer to approve. */
  fun_fact?: string;
  /** Image clues: the English Wikipedia article. */
  wiki_title?: string;
  /** Language clues: the phrase, its language and a translation. */
  text?: string;
  language?: string;
  english?: string;
}

export interface ExistingClue {
  id: string;
  cca3: string;
  clue_type: string;
  status: string;
  wiki_title: string | null;
  text_content: string | null;
}

export interface StagedChange {
  id: string;
  cca3: string;
  clue_type: string;
  from: string | null;
  /** The replacement, or null to remove the clue. */
  to: ClueProposal | null;
}

export interface SeedPlan {
  create: ClueProposal[];
  setDifficulty: { id: string; difficulty: ClueDifficulty }[];
  replace: { id: string; proposal: ClueProposal }[];
  /** Changes to clues players can currently see, held back for a later release. */
  staged: StagedChange[];
  reject: string[];
}

/** Clue types a proposal may omit; omission means "this country has no good one". */
const OPTIONAL_TYPES = new Set(["brand", "wildlife", "written_language"]);

/** Statuses the game draws from. */
const LIVE_STATUSES = new Set(["approved"]);

const valueOf = (clue: { clue_type: string; wiki_title?: string | null; text_content?: string | null; text?: string }) =>
  clue.clue_type === "written_language"
    ? ((clue.text ?? clue.text_content ?? "") as string)
    : (clue.wiki_title ?? "");

const sameValue = (a: string, b: string) =>
  a.replace(/_/g, " ").trim().toLowerCase() === b.replace(/_/g, " ").trim().toLowerCase();

/**
 * Works out how to apply a set of proposals without disturbing the live
 * game: new clues are created as drafts, clues that are not live are
 * rewritten, and any change to a live clue is staged instead of applied.
 */
export function planSeedChanges(existing: readonly ExistingClue[], proposals: readonly ClueProposal[]): SeedPlan {
  const plan: SeedPlan = { create: [], setDifficulty: [], replace: [], staged: [], reject: [] };
  const byKey = new Map(existing.map((clue) => [`${clue.cca3}:${clue.clue_type}`, clue]));
  const proposed = new Set(proposals.map((p) => `${p.cca3}:${p.clue_type}`));
  const reviewedCountries = new Set(proposals.map((p) => p.cca3));

  for (const proposal of proposals) {
    const current = byKey.get(`${proposal.cca3}:${proposal.clue_type}`);
    if (!current) {
      plan.create.push(proposal);
    } else if (sameValue(valueOf(current), valueOf(proposal))) {
      plan.setDifficulty.push({ id: current.id, difficulty: proposal.difficulty });
    } else if (LIVE_STATUSES.has(current.status)) {
      plan.staged.push({
        id: current.id,
        cca3: current.cca3,
        clue_type: current.clue_type,
        from: valueOf(current) || null,
        to: proposal,
      });
    } else {
      plan.replace.push({ id: current.id, proposal });
    }
  }

  for (const clue of existing) {
    if (!OPTIONAL_TYPES.has(clue.clue_type) || !reviewedCountries.has(clue.cca3)) continue;
    if (proposed.has(`${clue.cca3}:${clue.clue_type}`)) continue;
    if (LIVE_STATUSES.has(clue.status)) {
      plan.staged.push({ id: clue.id, cca3: clue.cca3, clue_type: clue.clue_type, from: valueOf(clue) || null, to: null });
    } else if (clue.status !== "rejected") {
      plan.reject.push(clue.id);
    }
  }

  return plan;
}
