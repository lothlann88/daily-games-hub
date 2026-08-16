import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  applyGameRevisions,
  GAME_REVISIONS_VERSION,
  SCORE_ORDER_SEEDS,
} from "@/lib/game-revisions";
import { Game, UserProfile, Score, Preferences } from "@/types";

export const KEYS = {
  GAMES: "games",
  DEFAULT_GAME_IDS_OFFERED: "defaultGameIdsOffered",
  GAME_REVISIONS_APPLIED: "gameRevisionsApplied",
  USER_PROFILE: "userProfile",
  SCORES: "scores",
  PREFERENCES: "preferences",
  ONBOARDING_COMPLETE: "onboardingComplete",
};

// Games: merge in any new default games so all users see them
export async function getGames(): Promise<Game[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.GAMES);
    let storedGames: Game[] = data ? JSON.parse(data) : [];
    // One-off default-game revisions (category moves, renames, score
    // directions) for existing libraries. Stamping updatedAt makes changes
    // local-newer, so the next merge sync (lib/merge.ts) uploads them.
    if (storedGames.length > 0) {
      const revisionsApplied = await AsyncStorage.getItem(KEYS.GAME_REVISIONS_APPLIED);
      if (revisionsApplied !== GAME_REVISIONS_VERSION) {
        const { games: revised, changed } = applyGameRevisions(storedGames);
        if (changed.length > 0) {
          const stampedIds = new Set(changed.map((g) => g.id));
          storedGames = revised.map((g) =>
            stampedIds.has(g.id) ? { ...g, updatedAt: Date.now() } : g
          );
          await saveGames(storedGames);
        }
        await AsyncStorage.setItem(KEYS.GAME_REVISIONS_APPLIED, GAME_REVISIONS_VERSION);
      }
    }
    const defaultGames = getDefaultGames();
    const offeredData = await AsyncStorage.getItem(KEYS.DEFAULT_GAME_IDS_OFFERED);
    const offeredIds: string[] = offeredData ? JSON.parse(offeredData) : [];
    const currentDefaultIds = defaultGames.map((g) => g.id);
    const newDefaultIds = currentDefaultIds.filter((id) => !offeredIds.includes(id));
    const storedIds = new Set(storedGames.map((g) => g.id));
    const toAdd = defaultGames.filter(
      (g) => newDefaultIds.includes(g.id) && !storedIds.has(g.id)
    );
    if (toAdd.length > 0) {
      // Stamping dateAdded/updatedAt makes new defaults local-only-or-newer,
      // so the next merge sync uploads them — no eager push needed.
      const stamped = toAdd.map((g) => ({
        ...g,
        dateAdded: Date.now(),
        updatedAt: Date.now(),
      }));
      const merged: Game[] = [...storedGames, ...stamped];
      await saveGames(merged);
      await AsyncStorage.setItem(
        KEYS.DEFAULT_GAME_IDS_OFFERED,
        JSON.stringify(currentDefaultIds)
      );
      return merged;
    }
    if (storedGames.length === 0) {
      await saveGames(defaultGames);
      await AsyncStorage.setItem(
        KEYS.DEFAULT_GAME_IDS_OFFERED,
        JSON.stringify(currentDefaultIds)
      );
      return defaultGames;
    }
    if (offeredIds.length === 0) {
      await AsyncStorage.setItem(
        KEYS.DEFAULT_GAME_IDS_OFFERED,
        JSON.stringify(currentDefaultIds)
      );
    }
    return storedGames;
  } catch (error) {
    console.error("Error loading games:", error);
    return getDefaultGames();
  }
}

export async function saveGames(games: Game[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(games));
  } catch (error) {
    console.error("Error saving games:", error);
  }
}

export async function addGame(game: Game): Promise<void> {
  const games = await getGames();
  games.push({ ...game, updatedAt: Date.now() });
  await saveGames(games);
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
  const games = await getGames();
  const index = games.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    games[index] = { ...games[index], ...updates, updatedAt: Date.now() };
    await saveGames(games);
  }
}

export async function deleteGame(gameId: string): Promise<void> {
  const games = await getGames();
  const filtered = games.filter((g) => g.id !== gameId);
  await saveGames(filtered);
}

// User Profile
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading user profile:", error);
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
}

export async function updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
  const profile = await getUserProfile();
  if (profile) {
    const updated = { ...profile, ...updates };
    await saveUserProfile(updated);
  }
}

// Onboarding
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
    return data === "true";
  } catch (error) {
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, "true");
  } catch (error) {
    console.error("Error setting onboarding complete:", error);
  }
}

// Scores. Deleted scores are soft-delete tombstones (kept so the deletion
// propagates through the sync merge); every read path filters them out, only
// the mutation paths below and lib/sync.ts see them.
async function getRawScores(): Promise<Score[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SCORES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading scores:", error);
    return [];
  }
}

export async function getScores(): Promise<Score[]> {
  const scores = await getRawScores();
  return scores.filter((s) => !s.deleted);
}

export async function saveScores(scores: Score[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(scores));
  } catch (error) {
    console.error("Error saving scores:", error);
  }
}

export async function addScore(score: Score): Promise<void> {
  const scores = await getRawScores();
  scores.push(score);
  await saveScores(scores);
  
  // Update game's lastPlayed timestamp and streaks
  const games = await getGames();
  const game = games.find((g) => g.id === score.gameId);
  if (game) {
    const updatedHistory = [...game.playHistory, score.datePlayed];
    
    // Import streak calculation functions
    const { calculateCurrentStreak, calculateLongestStreak } = await import("./streaks");
    
    const currentStreak = calculateCurrentStreak(updatedHistory);
    const longestStreak = Math.max(
      calculateLongestStreak(updatedHistory),
      game.longestStreak
    );
    
    await updateGame(score.gameId, {
      lastPlayed: score.datePlayed,
      playHistory: updatedHistory,
      currentStreak,
      longestStreak,
    });
  }
}

export async function getScoresByGame(gameId: string): Promise<Score[]> {
  const scores = await getScores();
  return scores.filter((s) => s.gameId === gameId).sort((a, b) => b.datePlayed - a.datePlayed);
}

/**
 * Correct a logged play (result, score value, note). Returns the updated
 * score for the caller to push to the cloud, or null if not found.
 */
export async function updateScore(
  scoreId: string,
  updates: Pick<Partial<Score>, "result" | "score" | "notes">
): Promise<Score | null> {
  const scores = await getRawScores();
  const index = scores.findIndex((s) => s.id === scoreId && !s.deleted);
  if (index === -1) return null;
  scores[index] = { ...scores[index], ...updates, updatedAt: Date.now() };
  await saveScores(scores);
  return scores[index];
}

/**
 * Soft-delete a logged play and rebuild the owning game's play-derived
 * fields without it. Returns the tombstone and the updated game (both for
 * pushing to the cloud), or null if the score wasn't found.
 */
export async function deleteScore(
  scoreId: string
): Promise<{ score: Score; game: Game | null } | null> {
  const scores = await getRawScores();
  const index = scores.findIndex((s) => s.id === scoreId && !s.deleted);
  if (index === -1) return null;
  const tombstone: Score = { ...scores[index], deleted: true, updatedAt: Date.now() };
  scores[index] = tombstone;
  await saveScores(scores);

  const games = await getGames();
  const game = games.find((g) => g.id === tombstone.gameId);
  if (!game) return { score: tombstone, game: null };

  const { calculateCurrentStreak, calculateLongestStreak } = await import("./streaks");
  const playHistory = game.playHistory.filter((ts) => ts !== tombstone.datePlayed);
  await updateGame(game.id, {
    playHistory,
    lastPlayed: playHistory.length > 0 ? Math.max(...playHistory) : undefined,
    currentStreak: calculateCurrentStreak(playHistory),
    // Recomputed from what remains — the sync merge's max() with the cloud
    // copy may keep an inflated best-ever until both sides converge.
    longestStreak: calculateLongestStreak(playHistory),
  });
  const updatedGames = await getGames();
  return { score: tombstone, game: updatedGames.find((g) => g.id === game.id) ?? null };
}

// Removed getScoresByPlayer - no longer needed in single-user mode

// Preferences
export async function getPreferences(): Promise<Preferences> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return data ? JSON.parse(data) : getDefaultPreferences();
  } catch (error) {
    console.error("Error loading preferences:", error);
    return getDefaultPreferences();
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error("Error saving preferences:", error);
  }
}

// Default data
function getDefaultGames(): Game[] {
  const defaults: Game[] = [
    {
      id: "wordle",
      name: "Wordle",
      url: "https://www.nytimes.com/games/wordle",
      category: "Word Games",
      icon: "🔤",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "nyt-mini",
      name: "NYT Mini Crossword",
      url: "https://www.nytimes.com/crosswords/game/mini",
      category: "Puzzles",
      icon: "📰",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "linkedin-queens",
      name: "LinkedIn Queens",
      url: "https://www.linkedin.com/games/queens/",
      category: "Logic & Deduction",
      icon: "👑",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "linkedin-pinpoint",
      name: "LinkedIn Pinpoint",
      url: "https://www.linkedin.com/games/pinpoint/",
      category: "Word Games",
      icon: "📍",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "connections",
      name: "Connections",
      url: "https://www.nytimes.com/games/connections",
      category: "Word Games",
      icon: "🔗",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "spelling-bee",
      name: "Spelling Bee",
      url: "https://www.nytimes.com/puzzles/spelling-bee",
      category: "Word Games",
      icon: "🐝",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "sudoku",
      name: "Sudoku",
      url: "https://www.nytimes.com/puzzles/sudoku/easy",
      category: "Logic & Deduction",
      icon: "🔢",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "guardian-mini",
      name: "Guardian Daily Mini",
      url: "https://www.theguardian.com/crosswords/series/mini-crossword",
      category: "Puzzles",
      icon: "📰",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "geoguessr",
      name: "Geoguessr",
      url: "https://www.geoguessr.com/daily-challenges",
      category: "Trivia",
      icon: "🌍",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "britannica-revealed",
      name: "Revealed",
      url: "https://www.britannica.com/games/revealed",
      category: "Puzzles",
      icon: "📖",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: ["Quick", "Logic"],
      notes: "Daily puzzle from Britannica. Guess the topic using the fewest reveals and hints. Tap black boxes to reveal words.",
    },
    {
      id: "redactle-unlimited",
      name: "Redactle Unlimited",
      url: "https://redactle-unlimited.com",
      category: "Word Games",
      icon: "📝",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Reveal the title of a redacted Wikipedia article by guessing words. Smart guessing matches plurals and inflections.",
    },
    {
      id: "bandle",
      name: "Bandle",
      url: "https://bandle.app",
      category: "Trivia",
      icon: "🎵",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "reunion",
      name: "Reunion",
      url: "https://www.merriam-webster.com/games/reunion",
      category: "Word Games",
      icon: "💭",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "strands",
      name: "Strands",
      url: "https://www.nytimes.com/games/strands",
      category: "Word Games",
      icon: "🧵",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "waffle",
      name: "Waffle",
      url: "https://wafflegame.net/daily",
      category: "Word Games",
      icon: "🧇",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "phrazle",
      name: "Phrazle",
      url: "https://solitaired.com/phrazle",
      category: "Word Games",
      icon: "💬",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "nerdle",
      name: "Nerdle",
      url: "https://nerdlegame.com",
      category: "Logic & Deduction",
      icon: "🔢",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "heardle",
      name: "Heardle Unlimited",
      url: "https://www.heardle.info",
      category: "Trivia",
      icon: "🎵",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "yeardle",
      name: "Yeardle",
      url: "https://histordle.com/yeardle",
      category: "Trivia",
      icon: "📅",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "flagle",
      name: "Flagle",
      url: "https://www.flagle.io",
      category: "Trivia",
      icon: "🚩",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "murdle",
      name: "Murdle",
      url: "https://murdle.com",
      category: "Logic & Deduction",
      icon: "🔍",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "framed",
      name: "Framed",
      url: "https://framed.wtf",
      category: "Movies",
      categories: ["Movies", "Trivia"],
      icon: "🎬",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "gamedle",
      name: "Gamedle Guess",
      url: "https://gamedle.wtf/guess",
      category: "Video Games",
      categories: ["Video Games", "Trivia"],
      icon: "🎮",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "gamedle-artwork",
      name: "Gamedle Artwork",
      url: "https://gamedle.wtf/artwork",
      category: "Video Games",
      categories: ["Video Games", "Trivia"],
      icon: "🎨",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "gamedle-classic",
      name: "Gamedle Cover Art",
      url: "https://gamedle.wtf/classic",
      category: "Video Games",
      categories: ["Video Games", "Trivia"],
      icon: "🕹️",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "clues-by-sam",
      name: "Clues by Sam",
      url: "https://cluesbysam.com",
      category: "Logic & Deduction",
      icon: "🕵️",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: ["Logic"],
      notes: "Daily deduction puzzle: tap suspects to reveal clues and work out who's criminal and who's innocent — no guessing, puzzles get harder through the week.",
    },
    {
      id: "duolingo",
      name: "Duolingo",
      url: "https://www.duolingo.com",
      category: "Language",
      icon: "🦉",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "gamedle-character",
      name: "Gamedle Character",
      url: "https://gamedle.wtf/characters",
      category: "Video Games",
      categories: ["Video Games", "Trivia"],
      icon: "🧙",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "gamedle-keywords",
      name: "Gamedle Keywords",
      url: "https://gamedle.wtf/keywords",
      category: "Video Games",
      categories: ["Video Games", "Trivia"],
      icon: "🔑",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
    {
      id: "movie-grid",
      name: "Movie Grid",
      url: "https://moviegrid.io",
      category: "Movies",
      categories: ["Movies", "Trivia"],
      icon: "🎥",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Guess the movie matching every clue — title constraints, dates, cast and crew. Nine guesses.",
    },
    {
      id: "quordle",
      name: "Quordle",
      url: "https://www.merriam-webster.com/games/quordle/",
      category: "Word Games",
      icon: "4️⃣",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Four Wordles at once, nine guesses shared between them.",
    },
    {
      id: "octordle",
      name: "Octordle",
      url: "https://www.merriam-webster.com/games/octordle/",
      category: "Word Games",
      icon: "8️⃣",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Eight Wordles at once, thirteen guesses shared between them.",
    },
    {
      id: "timdle",
      name: "Timdle",
      url: "https://www.timdle.com",
      category: "Trivia",
      icon: "⏳",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Put nine historical events in chronological order. Every wrong placement costs a point, so the fewer misses the higher the score.",
    },
    {
      id: "landmarkr",
      name: "Landmarkr",
      url: "https://www.landmarkr.app",
      category: "Trivia",
      icon: "🏛️",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "Name the place from up to six photos, one guess per photo — the fewer photos you need, the better.",
    },
  ];
  // Keep new installs in agreement with the revision-retrofitted ones.
  return defaults.map((g) => ({
    ...g,
    scoreOrder: SCORE_ORDER_SEEDS[g.id] ?? "higher",
  }));
}

function getDefaultPreferences(): Preferences {
  return {
    favoriteGameIds: [],
    librarySortMode: "smart",
  };
}
