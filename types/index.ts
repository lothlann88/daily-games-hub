export interface Game {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  dateAdded: number;
  lastPlayed?: number;
  currentStreak: number;
  longestStreak: number;
  playHistory: number[]; // Array of timestamps when game was played
  logoUrl?: string; // Fetched logo/favicon URL
  isFavorite: boolean;
  tags: string[]; // Tags like "Quick", "Challenging", "Logic", etc.
  notes?: string; // Personal notes about the game (strategies, tips, best scores)
  updatedAt?: number; // Last metadata write (epoch ms) — LWW clock for sync merge
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  createdAt?: number;
}

export interface Score {
  id: string;
  gameId: string;
  score?: number; // optional - log can be recorded without a score
  result: "win" | "loss" | "draw";
  datePlayed: number;
  notes?: string;
}

export interface Preferences {
  favoriteGameIds: string[];
  librarySortMode?: import("@/lib/library").LibrarySortMode;
}

export type GameCategory =
  | "Word Games"
  | "Puzzles"
  | "Logic & Deduction"
  | "Strategy"
  | "Trivia"
  | "Language"
  | "Other";

export type GameTag = "Quick" | "Challenging" | "Relaxing" | "Logic" | "Visual" | "Audio" | "Math" | "Geography" | "Music" | "Movies";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface SyncError {
  message: string;
  timestamp: number;
  operation: "upload" | "download" | "profile" | "general";
  retryable: boolean;
}
