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
