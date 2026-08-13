import { describe, expect, it } from "vitest";

import { mergeLibraries } from "@/lib/merge";
import { calculateCurrentStreak } from "@/lib/streaks";
import type { Game, Score } from "@/types";

// Fixed clock: midday, so day arithmetic is stable regardless of timezone.
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 13, 12, 0, 0).getTime();
const TODAY = NOW;
const YESTERDAY = NOW - DAY;

function makeGame(overrides: Partial<Game> & { id: string }): Game {
  return {
    name: overrides.id,
    url: "https://example.com",
    category: "Puzzles",
    icon: "",
    dateAdded: NOW - 30 * DAY,
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
    ...overrides,
  };
}

function makeScore(overrides: Partial<Score> & { id: string; gameId: string }): Score {
  return {
    result: "win",
    datePlayed: TODAY,
    ...overrides,
  };
}

const empty = { games: [], scores: [] };

describe("score merge", () => {
  it("unions by id and pushes exactly the local-only scores", () => {
    const shared = makeScore({ id: "s1", gameId: "wordle" });
    const localOnly = makeScore({ id: "s2", gameId: "wordle", datePlayed: YESTERDAY });
    const cloudOnly = makeScore({ id: "s3", gameId: "sudoku" });
    const result = mergeLibraries(
      { games: [], scores: [shared, localOnly] },
      { games: [], scores: [shared, cloudOnly] },
      NOW
    );
    expect(result.scores.map((s) => s.id).sort()).toEqual(["s1", "s2", "s3"]);
    expect(result.scoresToPush.map((s) => s.id)).toEqual(["s2"]);
  });
});

describe("game metadata merge", () => {
  it("keeps and pushes local-only games", () => {
    const game = makeGame({ id: "custom", updatedAt: NOW });
    const result = mergeLibraries({ games: [game], scores: [] }, empty, NOW);
    expect(result.games.map((g) => g.id)).toEqual(["custom"]);
    expect(result.gamesToPush.map((g) => g.id)).toEqual(["custom"]);
  });

  it("adopts cloud-only games without pushing them back", () => {
    const game = makeGame({ id: "wordle", updatedAt: NOW });
    const result = mergeLibraries(empty, { games: [game], scores: [] }, NOW);
    expect(result.games.map((g) => g.id)).toEqual(["wordle"]);
    expect(result.gamesToPush).toEqual([]);
  });

  it("local metadata wins and pushes when local updatedAt is newer", () => {
    const local = makeGame({ id: "wordle", name: "Wordle!", updatedAt: NOW });
    const cloud = makeGame({ id: "wordle", name: "Wordle", updatedAt: NOW - DAY });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    expect(result.games[0].name).toBe("Wordle!");
    expect(result.gamesToPush.map((g) => g.id)).toEqual(["wordle"]);
  });

  it("cloud metadata wins on newer cloud stamp and on ties, with no push", () => {
    const local = makeGame({ id: "wordle", name: "Old", updatedAt: NOW - DAY });
    const cloudNewer = makeGame({ id: "wordle", name: "New", updatedAt: NOW });
    expect(
      mergeLibraries(
        { games: [local], scores: [] },
        { games: [cloudNewer], scores: [] },
        NOW
      ).games[0].name
    ).toBe("New");

    const tieLocal = makeGame({ id: "wordle", name: "Local", updatedAt: NOW });
    const tieCloud = makeGame({ id: "wordle", name: "Cloud", updatedAt: NOW });
    const tie = mergeLibraries(
      { games: [tieLocal], scores: [] },
      { games: [tieCloud], scores: [] },
      NOW
    );
    expect(tie.games[0].name).toBe("Cloud");
    expect(tie.gamesToPush).toEqual([]);
  });

  it("falls back to dateAdded when updatedAt is missing", () => {
    const local = makeGame({ id: "wordle", name: "Newer", dateAdded: NOW });
    const cloud = makeGame({ id: "wordle", name: "Older", dateAdded: NOW - DAY });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    expect(result.games[0].name).toBe("Newer");
  });
});

describe("play-field recomputation", () => {
  it("counts a same-day play from each device once in the streak, losing neither score", () => {
    const local = makeGame({ id: "wordle", playHistory: [TODAY], currentStreak: 1 });
    const cloud = makeGame({ id: "wordle", playHistory: [TODAY - 1000], currentStreak: 1 });
    const result = mergeLibraries(
      { games: [local], scores: [makeScore({ id: "a", gameId: "wordle", datePlayed: TODAY })] },
      { games: [cloud], scores: [makeScore({ id: "b", gameId: "wordle", datePlayed: TODAY - 1000 })] },
      NOW
    );
    expect(result.scores).toHaveLength(2);
    expect(result.games[0].playHistory).toEqual([TODAY - 1000, TODAY]);
    expect(result.games[0].currentStreak).toBe(1);
  });

  it("builds a streak from consecutive days split across devices", () => {
    // Day 1 played on the other device (cloud), day 2 locally: neither copy
    // alone has a 2-day streak, the union does.
    const local = makeGame({ id: "wordle", playHistory: [TODAY], currentStreak: 1 });
    const cloud = makeGame({ id: "wordle", playHistory: [YESTERDAY], currentStreak: 1 });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    expect(result.games[0].currentStreak).toBe(2);
    expect(result.games[0].lastPlayed).toBe(TODAY);
  });

  it("preserves the historical longestStreak maximum", () => {
    const local = makeGame({ id: "wordle", playHistory: [TODAY], longestStreak: 9 });
    const cloud = makeGame({ id: "wordle", playHistory: [TODAY], longestStreak: 4 });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    expect(result.games[0].longestStreak).toBe(9);
  });

  it("pushes a cloud-LWW winner whose play fields changed in the recompute", () => {
    const local = makeGame({ id: "wordle", playHistory: [YESTERDAY], updatedAt: NOW - DAY });
    const cloud = makeGame({ id: "wordle", playHistory: [TODAY], currentStreak: 1, updatedAt: NOW });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    // Cloud won metadata, but the merged history gained yesterday's play →
    // streak went 1 → 2 and cloud must converge.
    expect(result.games[0].currentStreak).toBe(2);
    expect(result.gamesToPush.map((g) => g.id)).toEqual(["wordle"]);
  });

  it("keeps legacy playHistory entries that have no matching score record", () => {
    const legacyPlay = TODAY - 10 * DAY;
    const local = makeGame({ id: "wordle", playHistory: [legacyPlay] });
    const cloud = makeGame({ id: "wordle", playHistory: [] });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [cloud], scores: [] },
      NOW
    );
    expect(result.games[0].playHistory).toEqual([legacyPlay]);
  });

  it("adds score timestamps missing from both game records", () => {
    const local = makeGame({ id: "wordle", playHistory: [] });
    const score = makeScore({ id: "s1", gameId: "wordle", datePlayed: TODAY });
    const result = mergeLibraries(
      { games: [local], scores: [] },
      { games: [], scores: [score] },
      NOW
    );
    expect(result.games[0].playHistory).toEqual([TODAY]);
    expect(result.games[0].currentStreak).toBe(1);
  });
});

describe("round trips", () => {
  it("uploads everything to an empty cloud", () => {
    const games = [makeGame({ id: "a" }), makeGame({ id: "b" })];
    const scores = [makeScore({ id: "s", gameId: "a" })];
    const result = mergeLibraries({ games, scores }, empty, NOW);
    expect(result.gamesToPush).toHaveLength(2);
    expect(result.scoresToPush).toHaveLength(1);
  });

  it("adopts everything onto an empty device", () => {
    const games = [makeGame({ id: "a", currentStreak: 0 })];
    const scores = [makeScore({ id: "s", gameId: "a", datePlayed: TODAY })];
    const result = mergeLibraries(empty, { games, scores }, NOW);
    expect(result.games).toHaveLength(1);
    expect(result.scores).toHaveLength(1);
    expect(result.scoresToPush).toEqual([]);
  });
});

describe("calculateCurrentStreak with injected now", () => {
  it("is deterministic for a fixed clock", () => {
    expect(calculateCurrentStreak([YESTERDAY, TODAY], NOW)).toBe(2);
    expect(calculateCurrentStreak([NOW - 3 * DAY], NOW)).toBe(0);
  });
});
