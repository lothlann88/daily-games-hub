import type { GameCategory } from "@/types";

/** Canonical category list, in the order the add-game picker shows them. */
export const CATEGORIES: GameCategory[] = [
  "Word Games",
  "Puzzles",
  "Logic & Deduction",
  "Strategy",
  "Trivia",
  "Movies",
  "Video Games",
  "Language",
  "Other",
];

// One-off retrofits to existing libraries (category moves, renames, score
// directions) live in lib/game-revisions.ts.
