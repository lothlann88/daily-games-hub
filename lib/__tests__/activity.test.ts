import { describe, expect, it } from "vitest";

import {
  activityLevel,
  buildActivitySummary,
  buildCalendarMonth,
  buildDayWindow,
  playCountsByDay,
} from "@/lib/activity";
import { addDays, startOfDay } from "@/lib/dates";
import type { Game } from "@/types";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
const NOW = at(2026, 7, 20); // Thursday 20 August 2026

function makeGame(overrides: Partial<Game> & { id: string }): Game {
  return {
    name: "Test Game",
    url: "https://example.com",
    category: "Word Games",
    icon: "🎮",
    dateAdded: at(2026, 0, 1),
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
    ...overrides,
  };
}

const runEndingAt = (end: number, days: number) =>
  Array.from({ length: days }, (_, i) => addDays(end, -(days - 1 - i)));

describe("playCountsByDay", () => {
  it("counts a game once for a day it was played three times", () => {
    const game = makeGame({
      id: "wordle",
      playHistory: [at(2026, 7, 20, 8), at(2026, 7, 20, 13), at(2026, 7, 20, 22)],
    });
    expect(playCountsByDay([game]).get(startOfDay(NOW))).toBe(1);
  });

  it("adds up distinct games played on the same day", () => {
    const games = [
      makeGame({ id: "wordle", playHistory: [at(2026, 7, 20, 9)] }),
      makeGame({ id: "mini", playHistory: [at(2026, 7, 20, 18)] }),
    ];
    expect(playCountsByDay(games).get(startOfDay(NOW))).toBe(2);
  });

  it("is empty for a library with no plays", () => {
    expect(playCountsByDay([makeGame({ id: "wordle" })]).size).toBe(0);
  });
});

describe("activityLevel", () => {
  it("buckets counts into four steps", () => {
    expect([0, 1, 2, 3, 4, 12].map(activityLevel)).toEqual([0, 1, 2, 2, 3, 3]);
  });
});

describe("buildDayWindow", () => {
  it("returns exactly the requested number of days, oldest first, ending today", () => {
    const window = buildDayWindow(new Map(), 70, NOW);
    expect(window).toHaveLength(70);
    expect(window[69].date).toBe(startOfDay(NOW));
    expect(window[0].date).toBe(addDays(NOW, -69));
  });

  it("is strictly ascending with no gaps", () => {
    const window = buildDayWindow(new Map(), 30, NOW);
    for (let i = 1; i < window.length; i++) {
      expect(window[i].date).toBe(addDays(window[i - 1].date, 1));
    }
  });
});

describe("buildActivitySummary", () => {
  it("copes with an empty library", () => {
    const summary = buildActivitySummary([], 70, NOW);
    expect(summary.days).toHaveLength(70);
    expect(summary.days.every((d) => d.level === 0)).toBe(true);
    expect(summary.totalDaysPlayed).toBe(0);
    expect(summary.currentAnyStreak).toBe(0);
    expect(summary.longestAnyStreak).toBe(0);
    expect(summary.totalPlays).toBe(0);
    expect(summary.daysInLastWeek).toBe(0);
  });

  // The reason this feature exists: the library as a whole can be on a run even
  // when no individual game is.
  it("counts a run spanning different games", () => {
    const games = [
      makeGame({ id: "wordle", playHistory: [addDays(NOW, -3), addDays(NOW, -2)] }),
      makeGame({ id: "mini", playHistory: [addDays(NOW, -1), NOW] }),
    ];
    const summary = buildActivitySummary(games, 70, NOW);

    expect(summary.currentAnyStreak).toBe(4);
    expect(summary.totalDaysPlayed).toBe(4);
  });

  it("keeps a run alive when the last play was yesterday", () => {
    const games = [makeGame({ id: "wordle", playHistory: runEndingAt(addDays(NOW, -1), 3) })];
    expect(buildActivitySummary(games, 70, NOW).currentAnyStreak).toBe(3);
  });

  it("breaks a run when the last play was two days ago", () => {
    const games = [makeGame({ id: "wordle", playHistory: runEndingAt(addDays(NOW, -2), 3) })];
    expect(buildActivitySummary(games, 70, NOW).currentAnyStreak).toBe(0);
  });

  it("excludes an old play from the window but still counts it all-time", () => {
    const games = [makeGame({ id: "wordle", playHistory: [addDays(NOW, -100), NOW] })];
    const summary = buildActivitySummary(games, 70, NOW);

    expect(summary.days.some((d) => d.date === addDays(NOW, -100))).toBe(false);
    expect(summary.totalDaysPlayed).toBe(2);
    expect(summary.totalPlays).toBe(2);
  });

  it("counts days in the last week without double-counting two games in a day", () => {
    const games = [
      makeGame({ id: "wordle", playHistory: [NOW, addDays(NOW, -1)] }),
      makeGame({ id: "mini", playHistory: [NOW] }),
    ];
    expect(buildActivitySummary(games, 70, NOW).daysInLastWeek).toBe(2);
  });

  it("caps days in the last week at seven", () => {
    const games = [makeGame({ id: "wordle", playHistory: runEndingAt(NOW, 30) })];
    expect(buildActivitySummary(games, 70, NOW).daysInLastWeek).toBe(7);
  });

  it("reports the longest historical run, not the current one", () => {
    const games = [
      makeGame({
        id: "wordle",
        playHistory: [...runEndingAt(addDays(NOW, -40), 6), NOW],
      }),
    ];
    const summary = buildActivitySummary(games, 70, NOW);

    expect(summary.longestAnyStreak).toBe(6);
    expect(summary.currentAnyStreak).toBe(1);
  });

  it("counts every play, repeats included, in totalPlays", () => {
    const games = [
      makeGame({ id: "wordle", playHistory: [at(2026, 7, 20, 9), at(2026, 7, 20, 20)] }),
    ];
    const summary = buildActivitySummary(games, 70, NOW);

    expect(summary.totalPlays).toBe(2);
    expect(summary.totalDaysPlayed).toBe(1);
  });

  it("reports the busiest day inside the window", () => {
    const games = [
      makeGame({ id: "a", playHistory: [NOW] }),
      makeGame({ id: "b", playHistory: [NOW] }),
      makeGame({ id: "c", playHistory: [NOW] }),
    ];
    expect(buildActivitySummary(games, 70, NOW).busiestDayCount).toBe(3);
  });

  it("does not let a future-dated play inflate the week or break the run", () => {
    const games = [
      makeGame({ id: "wordle", playHistory: [...runEndingAt(NOW, 3), addDays(NOW, 5)] }),
    ];
    const summary = buildActivitySummary(games, 70, NOW);

    expect(summary.daysInLastWeek).toBe(3);
    expect(summary.currentAnyStreak).toBeGreaterThanOrEqual(3);
  });
});

describe("buildCalendarMonth", () => {
  it("lays out six rows of seven", () => {
    const month = buildCalendarMonth([], NOW, NOW);
    expect(month.weeks).toHaveLength(6);
    for (const week of month.weeks) expect(week).toHaveLength(7);
  });

  it("labels the month and starts each row on a Monday", () => {
    const month = buildCalendarMonth([], NOW, NOW);
    expect(month.label).toBe("August 2026");
    for (const week of month.weeks) {
      expect(new Date(week[0].date).getDay()).toBe(1); // Monday
    }
  });

  it("includes every day of the month exactly once", () => {
    const month = buildCalendarMonth([], NOW, NOW);
    const inMonth = month.weeks.flat().filter((c) => c.inMonth).map((c) => c.dayOfMonth);
    expect(inMonth).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it("has no leading padding when the first falls on a Monday", () => {
    // 1 June 2026 is a Monday.
    const month = buildCalendarMonth([], at(2026, 5, 15), NOW);
    expect(month.weeks[0][0].inMonth).toBe(true);
    expect(month.weeks[0][0].dayOfMonth).toBe(1);
  });

  it("marks exactly one cell as today in the current month", () => {
    const month = buildCalendarMonth([], NOW, NOW);
    expect(month.weeks.flat().filter((c) => c.isToday)).toHaveLength(1);
  });

  it("marks no cell as today in a different month", () => {
    const month = buildCalendarMonth([], at(2026, 2, 15), NOW);
    expect(month.weeks.flat().some((c) => c.isToday)).toBe(false);
  });

  it("flags future days and does not flag today", () => {
    const cells = buildCalendarMonth([], NOW, NOW).weeks.flat();
    expect(cells.find((c) => c.isToday)?.isFuture).toBe(false);
    expect(cells.find((c) => c.date === addDays(NOW, 1))?.isFuture).toBe(true);
  });

  it("reports real counts on padding days but excludes them from the totals", () => {
    // 31 July 2026 is a Friday, so it appears as padding in the August grid.
    const july31 = at(2026, 6, 31);
    const games = [makeGame({ id: "wordle", playHistory: [july31, NOW] })];
    const month = buildCalendarMonth(games, NOW, NOW);
    const padding = month.weeks.flat().find((c) => c.date === startOfDay(july31));

    expect(padding?.inMonth).toBe(false);
    expect(padding?.count).toBe(1);
    expect(month.daysPlayedInMonth).toBe(1);
  });

  it("counts in-month days and plays, repeats included", () => {
    const games = [
      makeGame({
        id: "wordle",
        playHistory: [at(2026, 7, 3, 9), at(2026, 7, 3, 21), at(2026, 7, 10)],
      }),
    ];
    const month = buildCalendarMonth(games, NOW, NOW);

    expect(month.daysPlayedInMonth).toBe(2);
    expect(month.playsInMonth).toBe(3);
  });

  it("handles February in leap and non-leap years", () => {
    const leap = buildCalendarMonth([], at(2028, 1, 10), NOW);
    const nonLeap = buildCalendarMonth([], at(2026, 1, 10), NOW);

    expect(leap.weeks.flat().filter((c) => c.inMonth)).toHaveLength(29);
    expect(nonLeap.weeks.flat().filter((c) => c.inMonth)).toHaveLength(28);
    expect(leap.weeks.flat()).toHaveLength(42);
    expect(nonLeap.weeks.flat()).toHaveLength(42);
  });
});
