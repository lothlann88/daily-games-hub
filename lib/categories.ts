import type { Game, GameCategory } from "@/types";

/** Canonical category list, in the order the add-game picker shows them. */
export const CATEGORIES: GameCategory[] = [
  "Word Games",
  "Puzzles",
  "Logic & Deduction",
  "Strategy",
  "Trivia",
  "Language",
  "Other",
];

// One-off remap of existing libraries when a category is added or renamed,
// keyed by the game's client id. Applied once per device in getGames(), then
// pushed to the cloud copy so the next full sync doesn't revert it. Bump the
// version whenever entries are added so already-migrated devices re-run it.
export const CATEGORY_REMAP_VERSION = "1";

export const CATEGORY_REMAP: Record<string, GameCategory> = {
  "clues-by-sam": "Logic & Deduction",
  murdle: "Logic & Deduction",
  sudoku: "Logic & Deduction",
  "linkedin-queens": "Logic & Deduction",
  nerdle: "Logic & Deduction",
};

/** Returns the remapped list plus just the games whose category changed. */
export function applyCategoryRemap(games: Game[]): {
  games: Game[];
  changed: Game[];
} {
  const changed: Game[] = [];
  const next = games.map((game) => {
    const target = CATEGORY_REMAP[game.id];
    if (target && game.category !== target) {
      const updated = { ...game, category: target };
      changed.push(updated);
      return updated;
    }
    return game;
  });
  return { games: next, changed };
}
