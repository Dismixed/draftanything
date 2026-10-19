/**
 * The day every daily game is keyed on. Puzzles reset at midnight US Eastern time
 * (EST or EDT, whichever is in force), the same moment for every player.
 */
export const DAILY_TIME_ZONE = "America/New_York";

const MS_PER_DAY = 86_400_000;

const dayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: DAILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function wallClock(instant: number): Record<string, number> {
  const parts: Record<string, number> = {};
  for (const { type, value } of dayParts.formatToParts(instant)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return parts;
}

/** How far Eastern wall-clock time is ahead of UTC at `instant` (negative: −4h or −5h). */
function offsetMs(instant: number): number {
  const p = wallClock(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Today's daily as YYYY-MM-DD. */
export function dailyDate(date: Date = new Date()): string {
  const p = wallClock(date.getTime());
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Whole days since 1970-01-01 for the day `dailyDate()` returns. */
export function dailyDayNumber(date: Date = new Date()): number {
  return Date.parse(`${dailyDate(date)}T00:00:00Z`) / MS_PER_DAY;
}

/** Time left until the next reset. */
export function msUntilNextDailyDay(now: number): number {
  const nextMidnightUtc = (dailyDayNumber(new Date(now)) + 1) * MS_PER_DAY;
  // Midnight Eastern is midnight UTC minus the offset in force at that moment; the
  // second pass settles the offset on days when the clocks change.
  const guess = nextMidnightUtc - offsetMs(nextMidnightUtc);
  return nextMidnightUtc - offsetMs(guess) - now;
}
