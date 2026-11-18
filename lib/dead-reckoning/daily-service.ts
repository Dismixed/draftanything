import "server-only";

import { BANK, CATEGORIES, TREASURE } from "./bank";
import { daysSinceLaunch, type Leg } from "./voyage";

/**
 * The seven legs for `date`, one per category in leg order. Day n takes question
 * n mod (list length) from each category, so the day is the same for everyone and
 * needs nothing stored.
 */
export function legsFor(date: string): Leg[] {
  const day = daysSinceLaunch(date);
  return CATEGORIES.map((category) => {
    const list = BANK[category];
    const q = list[((day % list.length) + list.length) % list.length];
    return { ...q, category };
  });
}

/** The treasure island's question for `date`, in the same day-by-day order. */
export function treasureFor(date: string): Leg {
  const day = daysSinceLaunch(date);
  const q = TREASURE[((day % TREASURE.length) + TREASURE.length) % TREASURE.length];
  return { ...q, category: "treasure" };
}
