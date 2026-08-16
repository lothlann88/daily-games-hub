import { faviconUrlFor } from "@/lib/logo-fetcher";
import type { Game, GameCategory, ScoreOrder } from "@/types";

// One-off patches to games in EXISTING libraries, keyed by client id —
// applied once per device in getGames() (marker in AsyncStorage), stamped
// with updatedAt so the sync merge uploads them. Bump the version whenever
// entries change so already-migrated devices re-run; patches must stay
// idempotent. This generalises the old category remap: fresh installs get
// the same values straight from getDefaultGames().
export const GAME_REVISIONS_VERSION = "4";

// Score direction seeds for the default library. Also merged into
// getDefaultGames() so new installs agree with retrofitted ones.
export const SCORE_ORDER_SEEDS: Record<string, ScoreOrder> = {
  wordle: "lower", // guesses
  "nyt-mini": "lower", // time
  "linkedin-queens": "lower", // time
  "linkedin-pinpoint": "lower", // guesses
  connections: "none",
  "spelling-bee": "higher", // points
  sudoku: "lower", // time
  "guardian-mini": "lower", // time
  geoguessr: "higher", // points
  "britannica-revealed": "lower", // reveals used
  "redactle-unlimited": "lower", // guesses
  bandle: "lower", // guesses
  reunion: "none",
  strands: "none",
  waffle: "higher", // stars remaining
  phrazle: "lower", // guesses
  nerdle: "lower", // guesses
  heardle: "lower", // seconds heard
  yeardle: "lower", // guesses
  flagle: "lower", // guesses
  murdle: "lower", // solve time
  framed: "lower", // guesses
  gamedle: "lower", // guesses
  "gamedle-artwork": "lower",
  "gamedle-classic": "lower",
  "gamedle-character": "lower",
  "gamedle-keywords": "lower",
  "clues-by-sam": "lower", // solve time
  duolingo: "higher", // XP
  "movie-grid": "higher", // correct cells out of 9
  quordle: "lower", // guesses
  octordle: "lower", // guesses
  timdle: "higher", // points
  landmarkr: "lower", // photos revealed
};

// v1 category moves (kept so a device that never ran v1 still gets them).
const CATEGORY_MOVES: Record<string, GameCategory> = {
  "clues-by-sam": "Logic & Deduction",
  murdle: "Logic & Deduction",
  sudoku: "Logic & Deduction",
  "linkedin-queens": "Logic & Deduction",
  nerdle: "Logic & Deduction",
};

function buildRevisions(): Record<string, Partial<Game>> {
  const revisions: Record<string, Partial<Game>> = {};
  const patch = (id: string, fields: Partial<Game>) => {
    revisions[id] = { ...revisions[id], ...fields };
  };
  for (const [id, category] of Object.entries(CATEGORY_MOVES)) patch(id, { category });
  for (const [id, scoreOrder] of Object.entries(SCORE_ORDER_SEEDS)) patch(id, { scoreOrder });
  // v2: the original Heardle shut down; point at Heardle Unlimited.
  patch("heardle", { name: "Heardle Unlimited", url: "https://www.heardle.info" });
  // v3: Gamedle's real mode structure — the base game is the /guess mode,
  // "classic" is the cover-art mode, and the characters path was wrong.
  // Renaming in place (same client ids) keeps play histories attached.
  const gamedleCategories: Partial<Game> = {
    category: "Video Games",
    categories: ["Video Games", "Trivia"],
  };
  patch("gamedle", {
    name: "Gamedle Guess",
    url: "https://gamedle.wtf/guess",
    ...gamedleCategories,
  });
  patch("gamedle-classic", { name: "Gamedle Cover Art", ...gamedleCategories });
  patch("gamedle-artwork", gamedleCategories);
  patch("gamedle-character", {
    url: "https://gamedle.wtf/characters",
    ...gamedleCategories,
  });
  // v3: film games join the new Movies category.
  patch("framed", { category: "Movies", categories: ["Movies", "Trivia"] });
  // v4: any game moved to a new URL above kept the favicon of the site it
  // left — Heardle was still showing Spotify's logo. Refresh the logo from
  // the new URL so the badge follows the move.
  for (const [id, fields] of Object.entries(revisions)) {
    if (!fields.url) continue;
    const logoUrl = faviconUrlFor(fields.url);
    if (logoUrl) patch(id, { logoUrl });
  }
  return revisions;
}

export const GAME_REVISIONS: Record<string, Partial<Game>> = buildRevisions();

/** Returns the patched list plus just the games that actually changed. */
export function applyGameRevisions(games: Game[]): {
  games: Game[];
  changed: Game[];
} {
  const changed: Game[] = [];
  const next = games.map((game) => {
    const patch = GAME_REVISIONS[game.id];
    if (!patch) return game;
    const differs = (Object.keys(patch) as (keyof Game)[]).some((key) => {
      const current = game[key];
      const target = patch[key];
      // Array-valued patches (categories) compare by content, not reference.
      if (Array.isArray(current) || Array.isArray(target)) {
        return JSON.stringify(current) !== JSON.stringify(target);
      }
      return current !== target;
    });
    if (!differs) return game;
    const updated = { ...game, ...patch };
    changed.push(updated);
    return updated;
  });
  return { games: next, changed };
}
