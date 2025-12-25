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
}

export interface Player {
  id: string;
  name: string;
  color: string;
}

export interface Score {
  id: string;
  gameId: string;
  playerId: string;
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
