import "server-only";

import { BANK, CATEGORIES } from "./bank";
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
