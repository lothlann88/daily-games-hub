import { describe, expect, it } from "vitest";

import { applyCategoryRemap, CATEGORIES, CATEGORY_REMAP } from "@/lib/categories";
import type { Game } from "@/types";

function makeGame(id: string, category: string): Game {
  return {
    id,
    name: id,
    url: "https://example.com",
    category,
    icon: "",
    dateAdded: 0,
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
  };
}

describe("CATEGORY_REMAP", () => {
  it("only maps to canonical categories", () => {
    for (const target of Object.values(CATEGORY_REMAP)) {
      expect(CATEGORIES).toContain(target);
    }
  });
});

describe("applyCategoryRemap", () => {
  it("moves mapped games and reports exactly the changed ones", () => {
    const games = [
      makeGame("sudoku", "Puzzles"),
      makeGame("wordle", "Word Games"),
    ];
    const { games: remapped, changed } = applyCategoryRemap(games);
    expect(remapped.find((g) => g.id === "sudoku")?.category).toBe("Logic & Deduction");
    expect(remapped.find((g) => g.id === "wordle")?.category).toBe("Word Games");
    expect(changed.map((g) => g.id)).toEqual(["sudoku"]);
  });

  it("is a no-op when everything is already in place", () => {
    const games = [makeGame("murdle", "Logic & Deduction")];
    const { games: remapped, changed } = applyCategoryRemap(games);
    expect(changed).toEqual([]);
    expect(remapped[0]).toBe(games[0]);
  });

  it("does not mutate the input games", () => {
    const games = [makeGame("nerdle", "Puzzles")];
    applyCategoryRemap(games);
    expect(games[0].category).toBe("Puzzles");
  });
});
