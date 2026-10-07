/** Analytics properties for one daily guess. */
export function guessEventProperties(
  puzzleId: string,
  roundIndex: number,
  result: { exact: boolean; distanceKm: number; roundScore: number },
  clueType: unknown,
) {
  return {
    puzzle_id: puzzleId,
    round_index: roundIndex,
    // Sent by the client, so only a short plain word is trusted.
    clue_type: typeof clueType === "string" && /^[a-z_]{1,32}$/.test(clueType) ? clueType : null,
    correct: result.exact,
    distance_km: Math.round(result.distanceKm),
    round_score: result.roundScore,
  };
}
