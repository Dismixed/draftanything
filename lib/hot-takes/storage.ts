import { getDateString } from "@/lib/streak/date";

/** Today's locked-in ranking, so a returning player sees their result and not an empty board. */
export interface HotTakesPlayed {
  category: string;
  placements: Record<string, string>;
}

const todayKey = () => `hot_takes_played_${getDateString()}`;

export function getHotTakesPlayed(category: string): HotTakesPlayed | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(todayKey()) || "null") as HotTakesPlayed | null;
    // The day's category can change if the schedule is edited; an old ranking no longer fits.
    return saved && saved.category === category && saved.placements ? saved : null;
  } catch {
    return null;
  }
}

export function saveHotTakesPlayed(played: HotTakesPlayed): void {
  try {
    localStorage.setItem(todayKey(), JSON.stringify(played));
  } catch {
    // Storage can be full or blocked; the ranking still counts for this visit.
  }
}
