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
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  avatarUrl?: string;
  isPrivate?: boolean;
  createdAt?: number;
}

export interface Score {
  id: string;
  gameId: string;
  score: number;
  result: "win" | "loss" | "draw";
  datePlayed: number;
  notes?: string;
}

export interface Preferences {
  remindersEnabled: boolean;
  reminderTime: string; // HH:MM format
  favoriteGameIds: string[];
}

export type GameCategory = "Word Games" | "Puzzles" | "Strategy" | "Trivia" | "Other";

export type GameTag = "Quick" | "Challenging" | "Relaxing" | "Logic" | "Visual" | "Audio" | "Math" | "Geography" | "Music" | "Movies";
