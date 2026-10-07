/** Things a reviewer should look at before approving a seed entry. */
export function reviewWarnings(entry: {
  round_key: string;
  img: string | null;
  audio: string | null;
  resolve_notes: string | null;
}): string[] {
  // The bulk seeder prefixes doubts about the match itself with "CHECK:".
  const warnings = (entry.resolve_notes ?? "")
    .split("\n")
    .filter((line) => line.startsWith("CHECK:"))
    .map((line) => line.slice("CHECK:".length).trim());

  if (entry.round_key === "song") {
    if (!entry.audio) warnings.push("No audio clip");
  } else if (!entry.img) {
    warnings.push("No image");
  }

  return warnings;
}
