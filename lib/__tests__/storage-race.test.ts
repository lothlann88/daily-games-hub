import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory AsyncStorage with a deliberate delay on every operation. The
// delay is the point: it widens the window between a read and its matching
// write, which is exactly where concurrent mutations used to lose each other.
const store = new Map<string, string>();
const settle = () => new Promise((resolve) => setTimeout(resolve, 2));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    async getItem(key: string) {
      await settle();
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      await settle();
      store.set(key, value);
    },
    async removeItem(key: string) {
      await settle();
      store.delete(key);
    },
    async multiRemove(keys: string[]) {
      await settle();
      keys.forEach((k) => store.delete(k));
    },
  },
}));

const storage = await import("@/lib/storage");
const { KEYS } = storage;

import type { Game, Score } from "@/types";

const at = (y: number, m: number, d: number) => new Date(y, m, d, 12).getTime();

function makeGame(id: string, overrides: Partial<Game> = {}): Game {
  return {
    id,
    name: id,
    url: `https://example.com/${id}`,
    category: "Word Games",
    icon: "G",
    dateAdded: at(2026, 0, 1),
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
    ...overrides,
  };
}

function makeScore(id: string, gameId: string, datePlayed: number): Score {
  return { id, gameId, result: "win", datePlayed };
}

const readGames = (): Game[] => JSON.parse(store.get(KEYS.GAMES) ?? "[]");
const readScores = (): Score[] => JSON.parse(store.get(KEYS.SCORES) ?? "[]");

// The default library seeds itself on read unless every default id is already
// recorded as offered. Capture the real ids once so these tests exercise only
// the games they set up.
let defaultIds: string[] = [];

beforeAll(async () => {
  store.clear();
  const seeded = await storage.getGames();
  defaultIds = seeded.map((g) => g.id);
});

beforeEach(() => {
  store.clear();
  store.set(KEYS.DEFAULT_GAME_IDS_OFFERED, JSON.stringify(defaultIds));
});

describe("concurrent game updates", () => {
  it("keeps every update when several run at once", async () => {
    const games = ["a", "b", "c", "d", "e"].map((id) => makeGame(id));
    store.set(KEYS.GAMES, JSON.stringify(games));

    // Each of these is a read-modify-write over the same array. Unserialised,
    // they all read the same starting state and the last write wins.
    await Promise.all(
      games.map((g) => storage.updateGame(g.id, { name: `${g.id}-renamed` }))
    );

    const saved = readGames();
    expect(saved).toHaveLength(5);
    for (const g of saved) {
      expect(g.name, `${g.id} lost its update`).toBe(`${g.id}-renamed`);
    }
  });

  it("keeps every game when adds and updates interleave", async () => {
    store.set(KEYS.GAMES, JSON.stringify([makeGame("existing")]));

    await Promise.all([
      storage.addGame(makeGame("new-1")),
      storage.updateGame("existing", { isFavorite: true }),
      storage.addGame(makeGame("new-2")),
    ]);

    const saved = readGames();
    expect(saved.map((g) => g.id).sort()).toEqual(["existing", "new-1", "new-2"]);
    expect(saved.find((g) => g.id === "existing")?.isFavorite).toBe(true);
  });

  it("does not resurrect a deleted game via a concurrent update", async () => {
    store.set(KEYS.GAMES, JSON.stringify([makeGame("a"), makeGame("b")]));

    await Promise.all([
      storage.deleteGame("a"),
      storage.updateGame("b", { isFavorite: true }),
    ]);

    const saved = readGames();
    expect(saved.map((g) => g.id)).toEqual(["b"]);
    expect(saved[0].isFavorite).toBe(true);
  });
});

describe("concurrent score logging", () => {
  it("records every play when several are logged at once", async () => {
    store.set(KEYS.GAMES, JSON.stringify([makeGame("wordle"), makeGame("mini")]));

    await Promise.all([
      storage.addScore(makeScore("s1", "wordle", at(2026, 7, 20))),
      storage.addScore(makeScore("s2", "mini", at(2026, 7, 20))),
      storage.addScore(makeScore("s3", "wordle", at(2026, 7, 21))),
    ]);

    expect(readScores().map((s) => s.id).sort()).toEqual(["s1", "s2", "s3"]);

    // The play history on each game must reflect every logged play too — this
    // is the second write inside addScore, and the one most easily lost.
    const saved = readGames();
    expect(saved.find((g) => g.id === "wordle")?.playHistory).toHaveLength(2);
    expect(saved.find((g) => g.id === "mini")?.playHistory).toHaveLength(1);
  });

  it("keeps a play logged while an unrelated game is being updated", async () => {
    store.set(KEYS.GAMES, JSON.stringify([makeGame("wordle"), makeGame("mini")]));

    await Promise.all([
      storage.addScore(makeScore("s1", "wordle", at(2026, 7, 20))),
      storage.updateGame("mini", { name: "NYT Mini" }),
    ]);

    const saved = readGames();
    expect(saved.find((g) => g.id === "wordle")?.playHistory).toEqual([at(2026, 7, 20)]);
    expect(saved.find((g) => g.id === "mini")?.name).toBe("NYT Mini");
  });

  it("tombstones a play and rebuilds the game without losing a concurrent edit", async () => {
    const played = at(2026, 7, 20);
    store.set(
      KEYS.GAMES,
      JSON.stringify([makeGame("wordle", { playHistory: [played], lastPlayed: played })])
    );
    store.set(KEYS.SCORES, JSON.stringify([makeScore("s1", "wordle", played)]));

    await Promise.all([
      storage.deleteScore("s1"),
      storage.updateGame("wordle", { isFavorite: true }),
    ]);

    const saved = readGames();
    const wordle = saved.find((g) => g.id === "wordle");
    expect(readScores()[0].deleted).toBe(true);
    expect(wordle?.playHistory).toEqual([]);
    expect(wordle?.isFavorite).toBe(true);
  });
});

describe("concurrent preference changes", () => {
  it("keeps both changes when two land together", async () => {
    store.set(
      KEYS.PREFERENCES,
      JSON.stringify({ favoriteGameIds: [], librarySortMode: "smart" })
    );

    await Promise.all([
      storage.updatePreferences({ librarySortMode: "alpha" }),
      storage.updatePreferences({ dashboardPanel: "calendar" }),
    ]);

    const saved = JSON.parse(store.get(KEYS.PREFERENCES)!);
    expect(saved.librarySortMode).toBe("alpha");
    expect(saved.dashboardPanel).toBe("calendar");
  });
});
