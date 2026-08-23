import { describe, expect, it } from "vitest";

import { addDays } from "@/lib/dates";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  updateGameStreaks,
  wasPlayedToday,
} from "@/lib/streaks";
import type { Game } from "@/types";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
const NOW = at(2026, 7, 20);

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

/** `days` consecutive play days ending on `end`. */
const runEndingAt = (end: number, days: number) =>
  Array.from({ length: days }, (_, i) => addDays(end, -(days - 1 - i)));

describe("calculateCurrentStreak", () => {
  it("is zero with no play history", () => {
    expect(calculateCurrentStreak([], NOW)).toBe(0);
  });

  it("counts a run ending today", () => {
    expect(calculateCurrentStreak(runEndingAt(NOW, 5), NOW)).toBe(5);
  });

  it("keeps the streak alive when the last play was yesterday", () => {
    expect(calculateCurrentStreak(runEndingAt(addDays(NOW, -1), 3), NOW)).toBe(3);
  });

  it("breaks when the last play was two days ago", () => {
    expect(calculateCurrentStreak(runEndingAt(addDays(NOW, -2), 3), NOW)).toBe(0);
  });

  it("counts several plays on one day only once", () => {
    const history = [at(2026, 7, 20, 8), at(2026, 7, 20, 14), at(2026, 7, 20, 22)];
    expect(calculateCurrentStreak(history, NOW)).toBe(1);
  });

  it("does not depend on the order of the history", () => {
    const ordered = runEndingAt(NOW, 4);
    const shuffled = [ordered[2], ordered[0], ordered[3], ordered[1]];
    expect(calculateCurrentStreak(shuffled, NOW)).toBe(4);
  });

  it("stops at the first gap", () => {
    const history = [...runEndingAt(NOW, 3), addDays(NOW, -10)];
    expect(calculateCurrentStreak(history, NOW)).toBe(3);
  });

  // Regression: day counting used Math.floor on millisecond division, so the
  // 23-hour spring-forward day counted as zero and cut the streak in half.
  it("survives a spring-forward clock change", () => {
    const endOfMarch = at(2026, 2, 31);
    expect(calculateCurrentStreak(runEndingAt(endOfMarch, 10), endOfMarch)).toBe(10);
  });

  it("survives an autumn clock change", () => {
    const endOfOctober = at(2026, 9, 31);
    expect(calculateCurrentStreak(runEndingAt(endOfOctober, 10), endOfOctober)).toBe(10);
  });
});

describe("calculateLongestStreak", () => {
  it("is zero with no play history", () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it("finds a historical run longer than the current one", () => {
    const history = [...runEndingAt(addDays(NOW, -30), 5), NOW];
    expect(calculateLongestStreak(history)).toBe(5);
  });

  it("counts a single play as one", () => {
    expect(calculateLongestStreak([NOW])).toBe(1);
  });
});

describe("updateGameStreaks", () => {
  it("appends the play and recomputes both streaks", () => {
    const game = makeGame({
      id: "wordle",
      playHistory: runEndingAt(addDays(NOW, -1), 2),
      currentStreak: 2,
      longestStreak: 2,
    });
    const updated = updateGameStreaks(game, NOW, NOW);

    expect(updated.playHistory).toHaveLength(3);
    expect(updated.currentStreak).toBe(3);
    expect(updated.longestStreak).toBe(3);
    expect(updated.lastPlayed).toBe(NOW);
  });

  it("never lowers a recorded best", () => {
    const game = makeGame({ id: "wordle", longestStreak: 40 });
    expect(updateGameStreaks(game, NOW, NOW).longestStreak).toBe(40);
  });

  it("does not resurrect a lapsed streak when a play is back-dated", () => {
    const game = makeGame({ id: "wordle", playHistory: runEndingAt(addDays(NOW, -31), 4) });
    const updated = updateGameStreaks(game, addDays(NOW, -30), NOW);

    expect(updated.currentStreak).toBe(0);
    expect(updated.longestStreak).toBe(5);
  });
});

describe("wasPlayedToday", () => {
  it("is false when the game has never been played", () => {
    expect(wasPlayedToday(makeGame({ id: "wordle" }), NOW)).toBe(false);
  });

  it("is true for a play late on the same local day", () => {
    const game = makeGame({ id: "wordle", lastPlayed: at(2026, 7, 20, 23) });
    expect(wasPlayedToday(game, at(2026, 7, 20, 1))).toBe(true);
  });

  it("is false for a play on the previous day", () => {
    const game = makeGame({ id: "wordle", lastPlayed: addDays(NOW, -1) });
    expect(wasPlayedToday(game, NOW)).toBe(false);
  });
});
