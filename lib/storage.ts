import AsyncStorage from "@react-native-async-storage/async-storage";
import { Game, Player, Score, Preferences } from "@/types";

const KEYS = {
  GAMES: "games",
  PLAYERS: "players",
  SCORES: "scores",
  PREFERENCES: "preferences",
};

// Games
export async function getGames(): Promise<Game[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.GAMES);
    return data ? JSON.parse(data) : getDefaultGames();
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
  games.push(game);
  await saveGames(games);
}

export async function updateGame(gameId: string, updates: Partial<Game>): Promise<void> {
  const games = await getGames();
  const index = games.findIndex((g) => g.id === gameId);
  if (index !== -1) {
    games[index] = { ...games[index], ...updates };
    await saveGames(games);
  }
}

export async function deleteGame(gameId: string): Promise<void> {
  const games = await getGames();
  const filtered = games.filter((g) => g.id !== gameId);
  await saveGames(filtered);
}

// Players
export async function getPlayers(): Promise<Player[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PLAYERS);
    return data ? JSON.parse(data) : getDefaultPlayers();
  } catch (error) {
    console.error("Error loading players:", error);
    return getDefaultPlayers();
  }
}

export async function savePlayers(players: Player[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
  } catch (error) {
    console.error("Error saving players:", error);
  }
}

export async function updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
  const players = await getPlayers();
  const index = players.findIndex((p) => p.id === playerId);
  if (index !== -1) {
    players[index] = { ...players[index], ...updates };
    await savePlayers(players);
  }
}

// Scores
export async function getScores(): Promise<Score[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SCORES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading scores:", error);
    return [];
  }
}

export async function saveScores(scores: Score[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(scores));
  } catch (error) {
    console.error("Error saving scores:", error);
  }
}

export async function addScore(score: Score): Promise<void> {
  const scores = await getScores();
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

export async function getScoresByPlayer(playerId: string): Promise<Score[]> {
  const scores = await getScores();
  return scores.filter((s) => s.playerId === playerId);
}

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
  return [
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
      category: "Strategy",
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
      category: "Puzzles",
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
      category: "Puzzles",
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
      name: "Heardle",
      url: "https://www.spotify.com/heardle",
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
      category: "Puzzles",
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
      category: "Trivia",
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
      name: "Gamedle",
      url: "https://gamedle.wtf",
      category: "Trivia",
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
      category: "Trivia",
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
      name: "Gamedle Classic",
      url: "https://gamedle.wtf/classic",
      category: "Trivia",
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
      id: "gamedle-character",
      name: "Gamedle Character",
      url: "https://gamedle.wtf/character",
      category: "Trivia",
      icon: "🧙",
      dateAdded: Date.now(),
      currentStreak: 0,
      longestStreak: 0,
      playHistory: [],
      isFavorite: false,
      tags: [],
      notes: "",
    },
  ];
}

function getDefaultPlayers(): Player[] {
  return [
    {
      id: "player1",
      name: "Player 1",
      color: "#007AFF",
    },
    {
      id: "player2",
      name: "Player 2",
      color: "#FF9500",
    },
  ];
}

function getDefaultPreferences(): Preferences {
  return {
    remindersEnabled: false,
    reminderTime: "09:00",
    favoriteGameIds: [],
  };
}
