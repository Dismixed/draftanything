import { buildShareText, formatShareDate, squares } from "@/lib/share/share-text";

const points = (n: number) => `${n.toLocaleString("en-US")} pts`;

/** One square per link after the given first word. Words themselves are never shared. */
export function chainLinkShare(
  wordStatuses: readonly string[],
  wordAttempts: readonly (readonly string[] | undefined)[],
  date: string,
): string {
  const marks = wordStatuses.slice(1).map((status, i) => {
    if (status !== "solved") return "bad" as const;
    return (wordAttempts[i + 1]?.length ?? 1) <= 1 ? ("good" as const) : ("ok" as const);
  });
  return buildShareText({ gameId: "chainlink", label: formatShareDate(date), lines: [squares(marks)] });
}

export function brainDeadShare(correct: number, score: number, date: string, total = 15): string {
  return buildShareText({
    gameId: "brain-dead",
    label: formatShareDate(date),
    lines: [`${correct} of ${total} · ${points(score)}`, "✅".repeat(correct) + (correct < total ? "❌" : "")],
  });
}

export function anyGuessrShare(
  rounds: readonly { roundScore: number }[],
  totalScore: number,
  date: string,
  maxRoundScore = 100,
): string {
  const marks = rounds.map((round) =>
    round.roundScore >= maxRoundScore ? ("good" as const) : round.roundScore <= 0 ? ("bad" as const) : ("ok" as const),
  );
  return buildShareText({ gameId: "anyguessr", label: formatShareDate(date), lines: [points(totalScore), squares(marks)] });
}

const FREEZEFRAMES_ROUNDS = ["🎬", "🎵", "📺", "💿"];

/** `rounds` is null when only the day's total was saved (returning to an already-played day). */
export function freezeFramesShare(
  rounds: readonly { correct: boolean }[] | null,
  score: number,
  date: string,
): string {
  const line =
    rounds && rounds.length === FREEZEFRAMES_ROUNDS.length
      ? `${rounds.map((round, i) => `${FREEZEFRAMES_ROUNDS[i]}${round.correct ? "✅" : "❌"}`).join(" ")} · ${points(score)}`
      : points(score);
  return buildShareText({ gameId: "freezeframes", label: formatShareDate(date), lines: [line] });
}

export function ballKnowledgeShare(category: string, score: number): string {
  return buildShareText({ gameId: "ball-knowledge", label: category, lines: [`I named ${score} in 60 seconds`] });
}

/** Shares the player's own picks only. The in-game crowd percentages are simulated and are never shared. */
export function hotTakesShare(categoryName: string, sTierLabels: readonly string[]): string {
  return buildShareText({
    gameId: "hot-takes",
    label: categoryName,
    lines: [sTierLabels.length > 0 ? `My S tier: ${sTierLabels.join(", ")}` : "Nothing made my S tier"],
  });
}

export function gettingWarmerShare(won: boolean, attempts: number, emojis: string, date: string): string {
  const result = won ? `Got it in ${attempts} ${attempts === 1 ? "guess" : "guesses"}` : "Didn't get it";
  return buildShareText({ gameId: "getting-warmer", label: formatShareDate(date), lines: [`${emojis} ${result}`] });
}
