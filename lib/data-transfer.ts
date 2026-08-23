import { Platform } from "react-native";
import { Paths, File as ExpoFile } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Game, UserProfile, Score, Preferences } from "@/types";
import { ExportData, parseExportData } from "@/lib/export-schema";
import { withStorageLock } from "@/lib/storage-lock";

export type { ExportData };
export { parseExportData };

const KEYS = {
  GAMES: "games",
  USER_PROFILE: "userProfile",
  SCORES: "scores",
  PREFERENCES: "preferences",
};

/**
 * Export all app data to JSON
 */
export async function exportData(): Promise<ExportData> {
  try {
    const [gamesData, profileData, scoresData, preferencesData] = await Promise.all([
      AsyncStorage.getItem(KEYS.GAMES),
      AsyncStorage.getItem(KEYS.USER_PROFILE),
      AsyncStorage.getItem(KEYS.SCORES),
      AsyncStorage.getItem(KEYS.PREFERENCES),
    ]);

    const exportData: ExportData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      games: gamesData ? JSON.parse(gamesData) : [],
      userProfile: profileData ? JSON.parse(profileData) : null,
      scores: scoresData ? JSON.parse(scoresData) : [],
      preferences: preferencesData ? JSON.parse(preferencesData) : null,
    };

    return exportData;
  } catch (error) {
    console.error("Error exporting data:", error);
    throw new Error("Failed to export data");
  }
}

/**
 * Export data and share as JSON file
 */
export async function exportAndShare(): Promise<void> {
  try {
    const data = await exportData();
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `daily-games-backup-${Date.now()}.json`;
    if (Platform.OS === "web") {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    }

    const file = new ExpoFile(Paths.cache, fileName);

    // Write to file
    await file.write(jsonString);

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export Daily Games Data",
        UTI: "public.json",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  } catch (error) {
    console.error("Error sharing export:", error);
    throw error;
  }
}

/**
 * Import data from JSON
 */
export async function importData(data: ExportData): Promise<void> {
  try {
    // Validate the whole shape before writing anything — a malformed or hostile
    // file would otherwise be persisted and synced to the cloud verbatim.
    const validated = parseExportData(data);
    data = validated;

    // One acquisition for the whole import: a half-applied import — games
    // replaced but scores not — is worse than either outcome on its own.
    const payload = data;
    await withStorageLock(async () => {
      await Promise.all([
        AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(payload.games)),
        payload.userProfile
          ? AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(payload.userProfile))
          : Promise.resolve(),
        AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(payload.scores)),
        payload.preferences
          ? AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(payload.preferences))
          : Promise.resolve(),
      ]);
    });
  } catch (error) {
    console.error("Error importing data:", error);
    throw new Error("Failed to import data");
  }
}

/**
 * Pick and import data from file
 */
export async function pickAndImportData(mode: "replace" | "merge" = "replace"): Promise<void> {
  try {
    let content: string | null = null;

    if (Platform.OS === "web") {
      const file = await new Promise<File | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = () => {
          resolve(input.files?.[0] ?? null);
        };
        input.click();
      });

      if (!file) {
        return;
      }

      content = await file.text();
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const file = new ExpoFile(fileUri);

      // Read file content
      content = await file.text();
    }

    if (!content) {
      return;
    }

    // Parse and validate the file before it touches storage — this guards the
    // merge path too, since mergeImportedData writes verbatim.
    const data: ExportData = parseExportData(JSON.parse(content));

    // Import data
    if (mode === "merge") {
      await mergeImportedData(data);
    } else {
      await importData(data);
    }
  } catch (error) {
    console.error("Error picking/importing file:", error);
    throw new Error("Failed to import data from file");
  }
}

/**
 * Merge imported data with existing data (instead of replacing)
 */
export async function mergeImportedData(data: ExportData): Promise<void> {
  try {
    // Read, merge and write under one acquisition — this is a
    // read-modify-write over four keys, and anything landing in the middle
    // would be dropped by the write that follows.
    await withStorageLock(async () => {
    // Get existing data
    const [existingGames, existingScores, existingProfile, existingPreferences] = await Promise.all([
      AsyncStorage.getItem(KEYS.GAMES),
      AsyncStorage.getItem(KEYS.SCORES),
      AsyncStorage.getItem(KEYS.USER_PROFILE),
      AsyncStorage.getItem(KEYS.PREFERENCES),
    ]);

    const currentGames: Game[] = existingGames ? JSON.parse(existingGames) : [];
    const currentScores: Score[] = existingScores ? JSON.parse(existingScores) : [];
    const currentProfile: UserProfile | null = existingProfile
      ? JSON.parse(existingProfile)
      : null;
    const currentPreferences: Preferences | null = existingPreferences
      ? JSON.parse(existingPreferences)
      : null;

    // Merge games (avoid duplicates by ID)
    const gamesMap = new Map(currentGames.map((g) => [g.id, g]));
    data.games.forEach((g) => {
      if (!gamesMap.has(g.id)) {
        gamesMap.set(g.id, g);
      }
    });

    // Merge scores (avoid duplicates by ID)
    const scoresMap = new Map(currentScores.map((s) => [s.id, s]));
    data.scores.forEach((s) => {
      if (!scoresMap.has(s.id)) {
        scoresMap.set(s.id, s);
      }
    });

    const mergedProfile = currentProfile ?? data.userProfile ?? null;
    const mergedPreferences =
      currentPreferences && data.preferences
        ? { ...currentPreferences, ...data.preferences }
        : currentPreferences ?? data.preferences ?? null;

    // Save merged data
    const writes: Promise<void>[] = [
      AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(Array.from(gamesMap.values()))),
      AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(Array.from(scoresMap.values()))),
    ];

    if (mergedProfile) {
      writes.push(AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(mergedProfile)));
    }

    if (mergedPreferences) {
      writes.push(AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(mergedPreferences)));
    }

    await Promise.all(writes);
    });
  } catch (error) {
    console.error("Error merging data:", error);
    throw new Error("Failed to merge imported data");
  }
}
