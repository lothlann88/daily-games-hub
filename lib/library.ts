import type { Game } from "@/types";

// Pure helpers behind the home-screen library list, extracted so the
// ordering and filtering rules are unit-testable.

/** Distinct categories across the library, alphabetical. */
export function libraryCategories(games: Game[]): string[] {
  const seen = new Set<string>();
  for (const game of games) {
    if (game.category) seen.add(game.category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export interface LibraryFilter {
  query: string;
  category: string | null; // null = all categories
}

/**
 * Library ordering: favourites pinned first; within each group, games not yet
 * played today come before played ones, longest current streak first.
 */
export function filterAndSortLibrary<T extends Game & { playedToday: boolean }>(
  games: T[],
  { query, category }: LibraryFilter
): T[] {
  const q = query.trim().toLowerCase();
  return games
    .filter(
      (g) =>
        (!q || g.name.toLowerCase().includes(q)) &&
        (!category || g.category === category)
    )
    .sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      if (a.playedToday !== b.playedToday) return a.playedToday ? 1 : -1;
      return b.currentStreak - a.currentStreak;
    });
}
