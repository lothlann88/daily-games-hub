import type { Game } from "@/types";

// Pure helpers behind the home-screen library list, extracted so the
// ordering and filtering rules are unit-testable.

/** Distinct categories across the library (primary + extra memberships), alphabetical. */
export function libraryCategories(games: Game[]): string[] {
  const seen = new Set<string>();
  for (const game of games) {
    if (game.category) seen.add(game.category);
    for (const c of game.categories ?? []) {
      if (c) seen.add(c);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/** A game matches a chip via its primary category or any extra membership. */
export function inCategory(game: Game, category: string | null): boolean {
  if (!category) return true;
  return game.category === category || (game.categories ?? []).includes(category);
}

export type LibrarySortMode = "smart" | "streak" | "alpha" | "lastPlayed";

export const SORT_MODE_CYCLE: LibrarySortMode[] = ["smart", "streak", "alpha", "lastPlayed"];

export const SORT_MODE_LABELS: Record<LibrarySortMode, string> = {
  smart: "smart",
  streak: "streak",
  alpha: "A–Z",
  lastPlayed: "recent",
};

export interface LibraryFilter {
  query: string;
  category: string | null; // null = all categories
  sort?: LibrarySortMode; // defaults to "smart"
}

type SortableGame = Game & { playedToday: boolean };

const COMPARATORS: Record<LibrarySortMode, (a: SortableGame, b: SortableGame) => number> = {
  // Games still to play today first, longest current streak first, then A–Z.
  // The name tiebreak matters: most libraries are mostly zero-streak, and
  // without it those games fell through to the stored array order, which
  // shifts under a sync merge and reads as random.
  smart: (a, b) => {
    if (a.playedToday !== b.playedToday) return a.playedToday ? 1 : -1;
    return b.currentStreak - a.currentStreak || a.name.localeCompare(b.name);
  },
  streak: (a, b) =>
    b.currentStreak - a.currentStreak ||
    b.longestStreak - a.longestStreak ||
    a.name.localeCompare(b.name),
  alpha: (a, b) => a.name.localeCompare(b.name),
  // Most recently played first; never-played sink to the bottom.
  lastPlayed: (a, b) =>
    (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name),
};

/**
 * Library ordering: favourites pinned first in every mode, then the chosen
 * sort mode's comparator.
 */
export function filterAndSortLibrary<T extends Game & { playedToday: boolean }>(
  games: T[],
  { query, category, sort = "smart" }: LibraryFilter
): T[] {
  const q = query.trim().toLowerCase();
  const compare = COMPARATORS[sort];
  return games
    .filter((g) => (!q || g.name.toLowerCase().includes(q)) && inCategory(g, category))
    .sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return compare(a, b);
    });
}
