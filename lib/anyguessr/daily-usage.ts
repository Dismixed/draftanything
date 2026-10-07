/** `${puzzleId}:${clueType}` → ISO dates the clue was shown, oldest first. */
export type DailyUsageIndex = Record<string, string[]>;

/** Which clues stored lineups have shown, and on which dates. */
export function usageIndexFromLineups(
  days: ReadonlyArray<{ date: string; rounds: ReadonlyArray<{ puzzleId: string; clueType: string }> }>,
): DailyUsageIndex {
  const index: DailyUsageIndex = {};
  for (const day of days) {
    for (const round of day.rounds) {
      const key = `${round.puzzleId}:${round.clueType}`;
      const dates = index[key] ?? [];
      if (!dates.includes(day.date)) dates.push(day.date);
      index[key] = dates;
    }
  }
  for (const key of Object.keys(index)) index[key].sort();
  return index;
}

export function dailyUsageForSeedEntry(
  usage: DailyUsageIndex,
  puzzleIdByCca3: Record<string, string>,
  cca3: string,
  clueType: string,
): string[] {
  const puzzleId = puzzleIdByCca3[cca3];
  if (!puzzleId) return [];
  return usage[`${puzzleId}:${clueType}`] ?? [];
}
