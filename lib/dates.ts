/**
 * Local-calendar date helpers.
 *
 * Every "day" in this app is a LOCAL calendar day (midnight to midnight in the
 * player's own timezone), not a UTC day — a game played at 23:00 belongs to
 * that evening, not to the next morning.
 *
 * These used to be duplicated in four places (streaks, the streak grid, the
 * calendar and the game-detail ledger), each with its own subtly different
 * arithmetic. They live here now so day-counting behaves the same everywhere.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight at the start of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Local calendar-day key, "YYYY-MM-DD". */
export function dayKey(ts: number): string {
  const date = new Date(ts);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Local midnight `n` days from `ts` (`n` may be negative). Uses setDate rather
 * than millisecond arithmetic so it lands on the right calendar day even
 * across a daylight-saving transition.
 */
export function addDays(ts: number, n: number): number {
  const date = new Date(startOfDay(ts));
  date.setDate(date.getDate() + n);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Whole local days from `from` to `to` (negative when `to` is earlier).
 *
 * Rounds rather than floors: clock-change days are 23 or 25 hours long, and
 * flooring 23/24 to 0 is what used to break a streak every spring.
 */
export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

/** Distinct local midnights in a timestamp list, ascending. */
export function uniqueDays(timestamps: number[]): number[] {
  const days = new Set(timestamps.map(startOfDay));
  return [...days].sort((a, b) => a - b);
}
