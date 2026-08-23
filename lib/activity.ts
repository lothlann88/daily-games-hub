/**
 * Play-activity aggregation across the whole library.
 *
 * The streak helpers in `lib/streaks.ts` answer "how is *this game* doing?".
 * These answer "which days did I play *anything*?" — the data behind the home
 * dashboard's activity grid and calendar.
 *
 * Everything here is pure and takes an injectable `now`, so it can be tested
 * without mocking the clock.
 */

import { addDays, daysBetween, startOfDay, uniqueDays } from "@/lib/dates";
import type { Game } from "@/types";

/** Shading bucket: 0 nothing, 1 light, 2 medium, 3 heavy. */
export type ActivityLevel = 0 | 1 | 2 | 3;

export interface ActivityDay {
  /** Local midnight, epoch ms. */
  date: number;
  /** Distinct games played that day. */
  count: number;
  level: ActivityLevel;
}

export interface ActivitySummary {
  /** Exactly `days` entries, oldest → newest, last entry is today. */
  days: ActivityDay[];
  /** Distinct days with at least one play, all time. */
  totalDaysPlayed: number;
  /** Days played out of the last seven, today included. */
  daysInLastWeek: number;
  /** Consecutive days ending today or yesterday, counting any game. */
  currentAnyStreak: number;
  /** Longest run of consecutive days ever, counting any game. */
  longestAnyStreak: number;
  /** Every logged play, all games, all time. */
  totalPlays: number;
  /** Most games played on a single day inside the window. */
  busiestDayCount: number;
}

/**
 * Distinct games played per local day.
 *
 * A game played three times in one day counts once — the shading answers
 * "how much of the library did I get through?", not "how many attempts?".
 */
export function playCountsByDay(games: Game[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const game of games) {
    // uniqueDays dedupes within a single game's history, so each game can
    // contribute at most one to any given day.
    for (const day of uniqueDays(game.playHistory ?? [])) {
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
  }
  return counts;
}

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  return 3;
}

/**
 * A fixed-length run of days ending at `now`'s local midnight, oldest → newest.
 * Days with no play are included with a count of zero, so the result always has
 * exactly `days` entries and the grid never shifts.
 */
export function buildDayWindow(
  counts: Map<number, number>,
  days: number,
  now: number = Date.now()
): ActivityDay[] {
  const today = startOfDay(now);
  const window: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const count = counts.get(date) ?? 0;
    window.push({ date, count, level: activityLevel(count) });
  }
  return window;
}

/** Longest run of consecutive days in an ascending list of local midnights. */
function longestRun(daysAscending: number[]): number {
  if (daysAscending.length === 0) return 0;
  let longest = 1;
  let run = 1;
  for (let i = 1; i < daysAscending.length; i++) {
    if (daysBetween(daysAscending[i - 1], daysAscending[i]) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }
  return longest;
}

/** Run of consecutive days ending today or yesterday, else zero. */
function currentRun(daysAscending: number[], now: number): number {
  // Drop anything dated after today. A play from a device with a wrong clock
  // is anomalous, and it must not silently erase a real run.
  const today = startOfDay(now);
  const days = daysAscending.filter((day) => day <= today);
  if (days.length === 0) return 0;

  // A run survives until the day after the last play, so playing yesterday but
  // not yet today still counts.
  if (daysBetween(days[days.length - 1], today) > 1) return 0;

  let run = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (daysBetween(days[i - 1], days[i]) !== 1) break;
    run++;
  }
  return run;
}

export function buildActivitySummary(
  games: Game[],
  days: number = 70,
  now: number = Date.now()
): ActivitySummary {
  const counts = playCountsByDay(games);
  const window = buildDayWindow(counts, days, now);
  const playedDays = [...counts.keys()].sort((a, b) => a - b);

  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  let daysInLastWeek = 0;
  for (const day of playedDays) {
    if (day >= weekStart && day <= today) daysInLastWeek++;
  }

  let totalPlays = 0;
  for (const game of games) totalPlays += game.playHistory?.length ?? 0;

  let busiestDayCount = 0;
  for (const day of window) busiestDayCount = Math.max(busiestDayCount, day.count);

  return {
    days: window,
    totalDaysPlayed: playedDays.length,
    daysInLastWeek,
    currentAnyStreak: currentRun(playedDays, now),
    longestAnyStreak: longestRun(playedDays),
    totalPlays,
    busiestDayCount,
  };
}

// ── Calendar ────────────────────────────────────────────────────────────────

export interface CalendarCell {
  date: number;
  dayOfMonth: number;
  count: number;
  level: ActivityLevel;
  /** False for the padding days from the neighbouring months. */
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface CalendarMonth {
  year: number;
  /** 0–11. */
  monthIndex: number;
  /** e.g. "August 2026". */
  label: string;
  /** Six rows of seven, Monday first. */
  weeks: CalendarCell[][];
  /** In-month days with at least one play. */
  daysPlayedInMonth: number;
  /** Every play logged in the month, counting repeats of the same game. */
  playsInMonth: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Monday = 0 … Sunday = 6 (JavaScript's getDay is Sunday = 0). */
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * The month containing `monthAnchor` as a 6×7 Monday-first grid, padded with
 * the neighbouring months' days so every row is full.
 */
export function buildCalendarMonth(
  games: Game[],
  monthAnchor: number = Date.now(),
  now: number = Date.now()
): CalendarMonth {
  const counts = playCountsByDay(games);
  const anchor = new Date(monthAnchor);
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();

  const firstOfMonth = new Date(year, monthIndex, 1);
  const gridStart = addDays(firstOfMonth.getTime(), -mondayFirstIndex(firstOfMonth));

  const today = startOfDay(now);
  const weeks: CalendarCell[][] = [];
  let daysPlayedInMonth = 0;

  // Every play in the month, repeats included — `counts` deliberately collapses
  // repeats of one game, so it can't answer this.
  let playsInMonth = 0;
  for (const game of games) {
    for (const ts of game.playHistory ?? []) {
      const played = new Date(ts);
      if (played.getMonth() === monthIndex && played.getFullYear() === year) playsInMonth++;
    }
  }

  for (let week = 0; week < 6; week++) {
    const row: CalendarCell[] = [];
    for (let weekday = 0; weekday < 7; weekday++) {
      const date = addDays(gridStart, week * 7 + weekday);
      const cellDate = new Date(date);
      const inMonth = cellDate.getMonth() === monthIndex && cellDate.getFullYear() === year;
      const count = counts.get(date) ?? 0;

      if (inMonth && count > 0) daysPlayedInMonth++;

      row.push({
        date,
        dayOfMonth: cellDate.getDate(),
        count,
        level: activityLevel(count),
        inMonth,
        isToday: date === today,
        isFuture: date > today,
      });
    }
    weeks.push(row);
  }

  return {
    year,
    monthIndex,
    label: `${MONTH_NAMES[monthIndex]} ${year}`,
    weeks,
    daysPlayedInMonth,
    playsInMonth,
  };
}

// ── Dashboard panels ────────────────────────────────────────────────────────

export type DashboardPanel = "activity" | "streak" | "calendar";

export const DASHBOARD_PANELS: readonly DashboardPanel[] = [
  "activity",
  "streak",
  "calendar",
];

export const DASHBOARD_PANEL_LABELS: Record<DashboardPanel, string> = {
  activity: "Activity",
  streak: "Streak",
  calendar: "Calendar",
};
