/** Things a reviewer should look at before approving a clue. */
export function reviewWarnings(entry: {
  country_common: string;
  clue_type: string;
  wiki_title: string | null;
  text_content: string | null;
  image_candidates: readonly unknown[];
  difficulty?: string | null;
}): string[] {
  const warnings: string[] = [];

  if (entry.clue_type !== "written_language" && entry.image_candidates.length === 0) {
    warnings.push("No usable image");
  }

  // A person's name is shown to the player, so it must not name the country.
  if (
    entry.clue_type === "person" &&
    (entry.text_content ?? entry.wiki_title ?? "").toLowerCase().includes(entry.country_common.toLowerCase())
  ) {
    warnings.push("Shown name contains the country");
  }

  if (!entry.difficulty) warnings.push("No difficulty set");

  return warnings;
}

/** Columns the review page needs; `vision_notes` alone is a sixth of the full payload. */
export const REVIEW_COLUMNS =
  "id, cca3, country_common, clue_type, wiki_title, text_content, status, difficulty, image_candidates, selected_candidate_index, notes";

/** A seed entry cut down to what a review card shows. */
export function toReviewEntry(row: Record<string, unknown>) {
  const candidates = Array.isArray(row.image_candidates) ? row.image_candidates : [];
  return {
    id: row.id as string,
    cca3: row.cca3 as string,
    country_common: row.country_common as string,
    clue_type: row.clue_type as string,
    wiki_title: (row.wiki_title as string | null) ?? null,
    text_content: (row.text_content as string | null) ?? null,
    status: row.status as string,
    difficulty: (row.difficulty as string | null) ?? null,
    selected_candidate_index: (row.selected_candidate_index as number | null) ?? 0,
    notes: (row.notes as string | null) ?? null,
    image_candidates: candidates.map((c: { image_url: string; thumb_url?: string }) => ({
      image_url: c.image_url,
      thumb_url: c.thumb_url,
    })),
  };
}
