import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { Game, Score, UserProfile, Preferences, SyncError } from "@/types";
import { KEYS } from "@/lib/storage";

const SYNC_STATUS_KEY = "@daily_games_sync_status";

interface SyncStatus {
  hasInitialSync: boolean;
  lastSyncTimestamp: number;
}

interface SyncResult {
  success: boolean;
  error?: SyncError;
}

/**
 * Get sync status from AsyncStorage
 */
async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const status = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (status) {
      return JSON.parse(status);
    }
  } catch (error) {
    console.error("[Sync] Error getting sync status:", error);
  }
  return { hasInitialSync: false, lastSyncTimestamp: 0 };
}

/**
 * Update sync status in AsyncStorage
 */
async function updateSyncStatus(status: Partial<SyncStatus>) {
  try {
    const currentStatus = await getSyncStatus();
    const newStatus = { ...currentStatus, ...status };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(newStatus));
  } catch (error) {
    console.error("[Sync] Error updating sync status:", error);
  }
}

/**
 * Sync user profile to cloud
 */
export async function syncUserProfile(profile: UserProfile): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("user_profiles").upsert({
      id: user.id,
      name: profile.name,
      avatar_url: profile.avatarUrl || null,
      is_private: profile.isPrivate ?? true,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    console.log("[Sync] User profile synced");
  } catch (error) {
    console.error("[Sync] Error syncing user profile:", error);
    throw error;
  }
}

/**
 * Sync games to cloud
 */
export async function syncGamesToCloud(games: Game[]): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const gamesData = games.map((game) => ({
      id: game.id,
      user_id: user.id,
      name: game.name,
      url: game.url,
      category: game.category,
      logo_url: game.logoUrl || null,
      icon: game.icon || null,
      is_favorite: game.isFavorite || false,
      current_streak: game.currentStreak || 0,
      longest_streak: game.longestStreak || 0,
      play_history: game.playHistory || [],
      notes: game.notes || null,
      tags: game.tags || [],
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("games").upsert(gamesData);

    if (error) throw error;
    console.log(`[Sync] ${games.length} games synced to cloud`);
  } catch (error) {
    console.error("[Sync] Error syncing games to cloud:", error);
    throw error;
  }
}

/**
 * Sync scores to cloud
 */
export async function syncScoresToCloud(scores: Score[]): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const scoresData = scores.map((score) => ({
      id: score.id,
      user_id: user.id,
      game_id: score.gameId,
      score: score.score,
      result: score.result,
      date_played: score.datePlayed,
      notes: score.notes || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("scores").upsert(scoresData);

    if (error) throw error;
    console.log(`[Sync] ${scores.length} scores synced to cloud`);
  } catch (error) {
    console.error("[Sync] Error syncing scores to cloud:", error);
    throw error;
  }
}

/**
 * Fetch games from cloud
 */
export async function fetchGamesFromCloud(): Promise<Game[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const games: Game[] = (data || []).map((game) => ({
      id: game.id,
      name: game.name,
      url: game.url,
      category: game.category,
      logoUrl: game.logo_url,
      icon: game.icon || '',
      dateAdded: new Date(game.created_at).getTime(),
      isFavorite: game.is_favorite,
      currentStreak: game.current_streak,
      longestStreak: game.longest_streak,
      playHistory: game.play_history || [],
      notes: game.notes,
      tags: game.tags || [],
    }));

    console.log(`[Sync] Fetched ${games.length} games from cloud`);
    return games;
  } catch (error) {
    console.error("[Sync] Error fetching games from cloud:", error);
    throw error;
  }
}

/**
 * Fetch scores from cloud
 */
export async function fetchScoresFromCloud(): Promise<Score[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error} = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", user.id)
      .order("date_played", { ascending: false });

    if (error) throw error;

    const scores: Score[] = (data || []).map((score) => ({
      id: score.id,
      gameId: score.game_id,
      score: score.score,
      result: score.result as "win" | "loss" | "draw",
      datePlayed: score.date_played,
      notes: score.notes,
    }));

    console.log(`[Sync] Fetched ${scores.length} scores from cloud`);
    return scores;
  } catch (error) {
    console.error("[Sync] Error fetching scores from cloud:", error);
    throw error;
  }
}

/**
 * Fetch user profile from cloud
 */
export async function fetchUserProfileFromCloud(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile doesn't exist yet
        return null;
      }
      throw error;
    }

    const profile: UserProfile = {
      id: data.id,
      name: data.name,
      avatarUrl: data.avatar_url,
      isPrivate: data.is_private ?? true,
    };

    console.log("[Sync] Fetched user profile from cloud");
    return profile;
  } catch (error) {
    console.error("[Sync] Error fetching user profile from cloud:", error);
    throw error;
  }
}

/**
 * Initial sync: Upload all local data to cloud (for first-time login)
 */
export async function performInitialSync(): Promise<void> {
  try {
    console.log("[Sync] Starting initial sync...");

    // Get all local data
    const gamesData = await AsyncStorage.getItem(KEYS.GAMES);
    const scoresData = await AsyncStorage.getItem(KEYS.SCORES);
    const profileData = await AsyncStorage.getItem(KEYS.USER_PROFILE);

    const games: Game[] = gamesData ? JSON.parse(gamesData) : [];
    const scores: Score[] = scoresData ? JSON.parse(scoresData) : [];
    const profile: UserProfile | null = profileData ? JSON.parse(profileData) : null;

    // Upload to cloud
    if (profile) {
      await syncUserProfile(profile);
    }
    if (games.length > 0) {
      await syncGamesToCloud(games);
    }
    if (scores.length > 0) {
      await syncScoresToCloud(scores);
    }

    // Mark initial sync as complete
    await updateSyncStatus({
      hasInitialSync: true,
      lastSyncTimestamp: Date.now(),
    });

    console.log("[Sync] Initial sync complete");
  } catch (error) {
    console.error("[Sync] Error during initial sync:", error);
    throw error;
  }
}

/**
 * Full sync: Download cloud data and merge with local
 */
export async function performFullSync(): Promise<void> {
  try {
    console.log("[Sync] Starting full sync...");

    // Fetch from cloud
    const [cloudGames, cloudScores, cloudProfile] = await Promise.all([
      fetchGamesFromCloud(),
      fetchScoresFromCloud(),
      fetchUserProfileFromCloud(),
    ]);

    // Save to local storage
    // Always save arrays (even if empty) to ensure sync consistency
    // Only skip saving if the fetch operation failed (null/undefined)
    if (cloudGames !== null && cloudGames !== undefined) {
      await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(cloudGames));
    }
    if (cloudScores !== null && cloudScores !== undefined) {
      await AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(cloudScores));
    }
    if (cloudProfile) {
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(cloudProfile));
    }

    // Update sync status
    await updateSyncStatus({
      lastSyncTimestamp: Date.now(),
    });

    console.log("[Sync] Full sync complete");
  } catch (error) {
    console.error("[Sync] Error during full sync:", error);
    throw error;
  }
}

/**
 * Check if initial sync has been performed
 */
export async function hasPerformedInitialSync(): Promise<boolean> {
  const status = await getSyncStatus();
  return status.hasInitialSync;
}

/**
 * Main sync function: Decides whether to do initial or full sync
 * Includes 60-second timeout to prevent hanging
 * Returns detailed error object instead of throwing
 */
export async function syncData(): Promise<SyncResult> {
  console.log("[Sync] Starting sync process...");

  try {
    // Add timeout to prevent infinite hanging
    const syncPromise = (async () => {
      console.log("[Sync] Checking if initial sync has been performed...");
      const hasInitialSync = await hasPerformedInitialSync();
      console.log("[Sync] Has initial sync:", hasInitialSync);

      if (!hasInitialSync) {
        console.log("[Sync] Performing initial sync (upload local data)...");
        await performInitialSync();
        console.log("[Sync] Initial sync completed");
      } else {
        console.log("[Sync] Performing full sync (download and merge)...");
        await performFullSync();
        console.log("[Sync] Full sync completed");
      }
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Sync timeout - operation took longer than 60 seconds")), 60000)
    );

    await Promise.race([syncPromise, timeoutPromise]);
    console.log("[Sync] Sync process completed successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[Sync] Error syncing data:", error);
    console.error("[Sync] Error details:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    // Determine if error is retryable based on error type
    const errorMessage = error?.message || "Unknown sync error";
    const isRetryable =
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError") ||
      error?.code === "ECONNREFUSED" ||
      error?.code === "ETIMEDOUT";

    // Determine operation type based on error context
    let operation: "upload" | "download" | "profile" | "general" = "general";
    if (errorMessage.includes("upload") || errorMessage.includes("upsert")) {
      operation = "upload";
    } else if (errorMessage.includes("fetch") || errorMessage.includes("download")) {
      operation = "download";
    } else if (errorMessage.includes("profile")) {
      operation = "profile";
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        timestamp: Date.now(),
        operation,
        retryable: isRetryable,
      },
    };
  }
}
