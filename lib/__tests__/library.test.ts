import { describe, expect, it } from "vitest";

import { filterAndSortLibrary, libraryCategories } from "@/lib/library";
import type { Game } from "@/types";

type LibraryGame = Game & { playedToday: boolean };

function makeGame(overrides: Partial<LibraryGame> & { id: string }): LibraryGame {
  return {
    name: overrides.id,
    url: "https://example.com",
    category: "Word Games",
    icon: "",
    dateAdded: 0,
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
    playedToday: false,
    ...overrides,
  };
}

describe("libraryCategories", () => {
  it("dedupes and sorts alphabetically, skipping empty categories", () => {
    const games = [
      makeGame({ id: "a", category: "Trivia" }),
      makeGame({ id: "b", category: "Puzzles" }),
      makeGame({ id: "c", category: "Trivia" }),
      makeGame({ id: "d", category: "" }),
    ];
    expect(libraryCategories(games)).toEqual(["Puzzles", "Trivia"]);
  });

  it("includes extra category memberships", () => {
    const games = [
      makeGame({ id: "a", category: "Video Games", categories: ["Video Games", "Trivia"] }),
    ];
    expect(libraryCategories(games)).toEqual(["Trivia", "Video Games"]);
  });
});

describe("filterAndSortLibrary", () => {
  it("matches the query case-insensitively", () => {
    const games = [
      makeGame({ id: "wordle", name: "Wordle" }),
      makeGame({ id: "sudoku", name: "Sudoku" }),
    ];
    const result = filterAndSortLibrary(games, { query: "WORD", category: null });
    expect(result.map((g) => g.id)).toEqual(["wordle"]);
  });

  it("matches a chip through any category membership, not just the primary", () => {
    const games = [
      makeGame({ id: "gamedle", category: "Video Games", categories: ["Video Games", "Trivia"] }),
      makeGame({ id: "wordle", category: "Word Games" }),
    ];
    expect(
      filterAndSortLibrary(games, { query: "", category: "Trivia" }).map((g) => g.id)
    ).toEqual(["gamedle"]);
    expect(
      filterAndSortLibrary(games, { query: "", category: "Video Games" }).map((g) => g.id)
    ).toEqual(["gamedle"]);
  });

  it("filters by category and combines it with the query", () => {
    const games = [
      makeGame({ id: "wordle", name: "Wordle", category: "Word Games" }),
      makeGame({ id: "waffle", name: "Waffle", category: "Word Games" }),
      makeGame({ id: "sudoku", name: "Sudoku", category: "Puzzles" }),
    ];
    expect(
      filterAndSortLibrary(games, { query: "", category: "Puzzles" }).map((g) => g.id)
    ).toEqual(["sudoku"]);
    expect(
      filterAndSortLibrary(games, { query: "waf", category: "Word Games" }).map(
        (g) => g.id
      )
    ).toEqual(["waffle"]);
  });

  it("pins favourites first, even when already played today", () => {
    const games = [
      makeGame({ id: "unplayed", currentStreak: 9 }),
      makeGame({ id: "fav", isFavorite: true, playedToday: true }),
    ];
    const result = filterAndSortLibrary(games, { query: "", category: null });
    expect(result.map((g) => g.id)).toEqual(["fav", "unplayed"]);
  });

  it("sorts by streak in streak mode, tiebreaking on longest then name", () => {
    const games = [
      makeGame({ id: "b-tie", name: "B", currentStreak: 3, longestStreak: 5 }),
      makeGame({ id: "low", name: "Low", currentStreak: 1 }),
      makeGame({ id: "a-tie", name: "A", currentStreak: 3, longestStreak: 5 }),
      makeGame({ id: "long", name: "Long", currentStreak: 3, longestStreak: 9 }),
    ];
    const result = filterAndSortLibrary(games, { query: "", category: null, sort: "streak" });
    expect(result.map((g) => g.id)).toEqual(["long", "a-tie", "b-tie", "low"]);
  });

  it("sorts alphabetically in alpha mode regardless of play state", () => {
    const games = [
      makeGame({ id: "z", name: "Zip", currentStreak: 9 }),
      makeGame({ id: "a", name: "Arrow", playedToday: true }),
    ];
    const result = filterAndSortLibrary(games, { query: "", category: null, sort: "alpha" });
    expect(result.map((g) => g.id)).toEqual(["a", "z"]);
  });

  it("sorts most recent first in lastPlayed mode, never-played last", () => {
    const games = [
      makeGame({ id: "never", name: "Never" }),
      makeGame({ id: "old", name: "Old", lastPlayed: 100 }),
      makeGame({ id: "fresh", name: "Fresh", lastPlayed: 900 }),
    ];
    const result = filterAndSortLibrary(games, {
      query: "",
      category: null,
      sort: "lastPlayed",
    });
    expect(result.map((g) => g.id)).toEqual(["fresh", "old", "never"]);
  });

  it("pins favourites first in every mode", () => {
    const games = [
      makeGame({ id: "z-fav", name: "Zz", isFavorite: true }),
      makeGame({ id: "a", name: "Aa", currentStreak: 9, lastPlayed: 900 }),
    ];
    for (const sort of ["smart", "streak", "alpha", "lastPlayed"] as const) {
      const result = filterAndSortLibrary(games, { query: "", category: null, sort });
      expect(result[0].id, sort).toBe("z-fav");
    }
  });

  it("falls back to A–Z in smart mode instead of the stored order", () => {
    const games = [
      makeGame({ id: "cherry", name: "Cherry" }),
      makeGame({ id: "apple", name: "Apple" }),
      makeGame({ id: "banana", name: "Banana" }),
      makeGame({ id: "streaky", name: "Zebra", currentStreak: 4 }),
      makeGame({ id: "played", name: "Aardvark", playedToday: true }),
    ];
    const result = filterAndSortLibrary(games, { query: "", category: null });
    expect(result.map((g) => g.id)).toEqual([
      "streaky",
      "apple",
      "banana",
      "cherry",
      "played",
    ]);
    // Same games, different stored order — same result.
    const shuffled = filterAndSortLibrary([...games].reverse(), {
      query: "",
      category: null,
    });
    expect(shuffled.map((g) => g.id)).toEqual(result.map((g) => g.id));
  });

  it("orders each group: unplayed before played, then streak descending", () => {
    const games = [
      makeGame({ id: "played-long", playedToday: true, currentStreak: 20 }),
      makeGame({ id: "unplayed-short", currentStreak: 1 }),
      makeGame({ id: "unplayed-long", currentStreak: 5 }),
      makeGame({ id: "fav-played", isFavorite: true, playedToday: true, currentStreak: 2 }),
      makeGame({ id: "fav-unplayed", isFavorite: true, currentStreak: 1 }),
    ];
    const result = filterAndSortLibrary(games, { query: "", category: null });
    expect(result.map((g) => g.id)).toEqual([
      "fav-unplayed",
      "fav-played",
      "unplayed-long",
      "unplayed-short",
      "played-long",
    ]);
  });
});
