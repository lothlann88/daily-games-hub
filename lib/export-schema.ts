import { z } from "zod";
import { Game, UserProfile, Score, Preferences } from "@/types";

// Shape of an exported backup file. Kept in this react-native-free module so the
// validation below can be unit-tested without pulling in native modules.
export interface ExportData {
  version: string;
  exportDate: string;
  games: Game[];
  userProfile: UserProfile | null;
  scores: Score[];
  preferences: Preferences | null;
}

// Validation schemas for imported backup files. A backup is untrusted input —
// it lands in AsyncStorage and the next sync pushes it to the cloud, so a
// malformed or hostile file must be rejected before it can poison the data
// model. We validate the required fields of each shape and keep any extra keys
// (looseObject) so a backup written by a newer app version round-trips intact.
const gameSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  category: z.string(),
  icon: z.string(),
  dateAdded: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  playHistory: z.array(z.number()),
  isFavorite: z.boolean(),
  tags: z.array(z.string()),
});

const scoreSchema = z.looseObject({
  id: z.string(),
  gameId: z.string(),
  result: z.enum(["win", "loss", "draw"]),
  datePlayed: z.number(),
});

const userProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
});

const preferencesSchema = z.looseObject({
  favoriteGameIds: z.array(z.string()),
});

const exportDataSchema = z.looseObject({
  version: z.string(),
  games: z.array(gameSchema),
  scores: z.array(scoreSchema),
  userProfile: userProfileSchema.nullish(),
  preferences: preferencesSchema.nullish(),
});

/**
 * Validate a parsed backup object against the expected export shape. Throws a
 * ZodError if the file is not a valid backup; returns it typed as ExportData on
 * success. Pure and side-effect free so it can be unit-tested.
 */
export function parseExportData(raw: unknown): ExportData {
  return exportDataSchema.parse(raw) as unknown as ExportData;
}
