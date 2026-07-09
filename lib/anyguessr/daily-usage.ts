import type { Clue } from "./types";
import {
  DAILY_ROUND_CLUE_TYPES,
  pickDailyPuzzles,
} from "./daily";

export interface DailyPickRow {
  id: string;
  answer_id: string | null;
  clues: Clue[];
}

/** `${puzzleId}:${clueType}` → ISO dates when that clue was shown in daily. */
export type DailyUsageIndex = Record<string, string[]>;

function parseDateUTC(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function computeDailyUsageIndex(
  puzzles: DailyPickRow[],
  options?: { endDate?: string; lookbackDays?: number },
): DailyUsageIndex {
  const endDate = options?.endDate ?? formatDateUTC(new Date());
  const lookbackDays = options?.lookbackDays ?? 120;
  const index: DailyUsageIndex = {};

  if (puzzles.length === 0) return index;

  for (let offset = 0; offset < lookbackDays; offset++) {
    const date = formatDateUTC(addDaysUTC(parseDateUTC(endDate), -offset));
    try {
      const picks = pickDailyPuzzles(puzzles, date);
      for (let i = 0; i < DAILY_ROUND_CLUE_TYPES.length; i++) {
        const clueType = DAILY_ROUND_CLUE_TYPES[i];
        const key = `${picks[i].id}:${clueType}`;
        const dates = index[key] ?? [];
        if (!dates.includes(date)) dates.push(date);
        index[key] = dates;
      }
    } catch {
      // skip dates the pool cannot fill
    }
  }

  for (const key of Object.keys(index)) {
    index[key].sort();
  }
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
