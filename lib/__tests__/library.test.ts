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
