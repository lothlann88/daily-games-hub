import AsyncStorage from "@react-native-async-storage/async-storage";
import { pb, currentUserId } from "./pocketbase";
import { Game, Score, UserProfile, SyncError } from "@/types";
import { mergeLibraries } from "@/lib/merge";
import { KEYS, setOnboardingComplete } from "@/lib/storage";

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

function gameToRecord(userId: string, game: Game) {
  return {
    owner: userId,
    client_id: game.id,
    name: game.name,
    url: game.url,
    category: game.category,
    logo_url: game.logoUrl || "",
    icon: game.icon || "",
    is_favorite: game.isFavorite || false,
    current_streak: game.currentStreak || 0,
    longest_streak: game.longestStreak || 0,
    play_history: game.playHistory || [],
    date_added: game.dateAdded || 0,
    notes: game.notes || "",
    tags: game.tags || [],
    updated_at: game.updatedAt || 0,
    score_order: game.scoreOrder || "",
  };
}

function recordToGame(record: any): Game {
  const playHistory: number[] = record.play_history || [];
  return {
    id: record.client_id,
    name: record.name,
    url: record.url,
    category: record.category,
    logoUrl: record.logo_url || undefined,
    icon: record.icon || "",
    dateAdded: record.date_added || new Date(record.created).getTime(),
    ...(playHistory.length > 0 ? { lastPlayed: Math.max(...playHistory) } : {}),
    isFavorite: record.is_favorite,
    currentStreak: record.current_streak,
    longestStreak: record.longest_streak,
    playHistory,
    notes: record.notes || undefined,
    tags: record.tags || [],
    // Records predating the updated_at migration fall back to the server
    // autodate — slightly generous (it bumps on every push) but self-healing
    // after the record's first stamped write.
    updatedAt: record.updated_at || new Date(record.updated).getTime(),
    ...(record.score_order ? { scoreOrder: record.score_order } : {}),
  };
}

function scoreToRecord(userId: string, score: Score) {
  return {
    owner: userId,
    client_id: score.id,
    game_id: score.gameId,
    // json field: null when the play was logged without a numeric score
    score: score.score ?? null,
    result: score.result,
    date_played: score.datePlayed,
    notes: score.notes || "",
    updated_at: score.updatedAt || 0,
    deleted: score.deleted || false,
  };
}

function recordToScore(record: any): Score {
  return {
    id: record.client_id,
    gameId: record.game_id,
    ...(record.score != null ? { score: record.score } : {}),
    result: record.result as "win" | "loss" | "draw",
    datePlayed: record.date_played,
    notes: record.notes || undefined,
    ...(record.updated_at ? { updatedAt: record.updated_at } : {}),
    ...(record.deleted ? { deleted: true } : {}),
  };
}

/**
 * Create-or-update a set of local items against a PocketBase collection,
 * matching on the client-generated id (client_id). PocketBase has no
 * server-side upsert on a secondary key, so existing records are fetched once
 * and diffed; writes go through the transactional batch API.
 */
async function upsertByClientId(
  collection: "games" | "scores",
  userId: string,
  items: { clientId: string; body: Record<string, unknown> }[],
): Promise<void> {
  if (items.length === 0) return;

  const existing = await pb.collection(collection).getFullList({
    filter: pb.filter("owner = {:owner}", { owner: userId }),
    fields: "id,client_id",
  });
  const existingByClientId = new Map(existing.map((r: any) => [r.client_id, r.id]));

  const batch = pb.createBatch();
  for (const item of items) {
    const recordId = existingByClientId.get(item.clientId);
    if (recordId) {
      batch.collection(collection).update(recordId, item.body);
    } else {
      batch.collection(collection).create(item.body);
    }
  }
  await batch.send();
}

/**
 * Sync user profile to cloud (profile fields live on the users auth record)
 */
export async function syncUserProfile(profile: UserProfile): Promise<void> {
  try {
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    await pb.collection("users").update(userId, {
      name: profile.name,
      ...(profile.username ? { username: profile.username } : {}),
      avatar_url: profile.avatarUrl || "",
      is_private: profile.isPrivate ?? true,
    });

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
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    await upsertByClientId(
      "games",
      userId,
      games.map((game) => ({ clientId: game.id, body: gameToRecord(userId, game) })),
    );

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
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    await upsertByClientId(
      "scores",
      userId,
      scores.map((score) => ({ clientId: score.id, body: scoreToRecord(userId, score) })),
    );

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
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    const records = await pb.collection("games").getFullList({
      filter: pb.filter("owner = {:owner}", { owner: userId }),
      sort: "-created",
    });

    const games = records.map(recordToGame);
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
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    const records = await pb.collection("scores").getFullList({
      filter: pb.filter("owner = {:owner}", { owner: userId }),
      sort: "-date_played",
    });

    const scores = records.map(recordToScore);
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
    const userId = currentUserId();
    if (!userId) throw new Error("Not authenticated");

    const record = await pb.collection("users").getOne(userId);

    const profile: UserProfile = {
      id: record.id,
      name: record.name,
      username: record.username || undefined,
      avatarUrl: record.avatar_url || undefined,
      isPrivate: record.is_private ?? true,
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
 * Full sync: two-way per-record merge between local and cloud (lib/merge.ts).
 * Local-only and locally-newer records are pushed up instead of being
 * replaced; play-derived fields are recomputed from the union of scores so
 * plays logged on two devices both count. Merged state is written locally
 * FIRST — if the push-back fails, local is already correct and every
 * un-pushed record is still local-newer/local-only, so the next sync
 * naturally retries.
 */
export async function performFullSync(): Promise<void> {
  try {
    console.log("[Sync] Starting merge sync...");

    // Read local raw (not via getGames(), whose default-merge side effects
    // shouldn't run mid-sync).
    const [gamesData, scoresData] = await Promise.all([
      AsyncStorage.getItem(KEYS.GAMES),
      AsyncStorage.getItem(KEYS.SCORES),
    ]);
    const localGames: Game[] = gamesData ? JSON.parse(gamesData) : [];
    const localScores: Score[] = scoresData ? JSON.parse(scoresData) : [];

    const [cloudGames, cloudScores, cloudProfile] = await Promise.all([
      fetchGamesFromCloud(),
      fetchScoresFromCloud(),
      fetchUserProfileFromCloud(),
    ]);

    const merged = mergeLibraries(
      { games: localGames, scores: localScores },
      { games: cloudGames, scores: cloudScores },
    );

    await AsyncStorage.setItem(KEYS.GAMES, JSON.stringify(merged.games));
    await AsyncStorage.setItem(KEYS.SCORES, JSON.stringify(merged.scores));
    // Profile stays cloud-wins on download; renames push at write time.
    if (cloudProfile) {
      await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(cloudProfile));
    }

    if (merged.scoresToPush.length > 0) {
      await syncScoresToCloud(merged.scoresToPush);
    }
    if (merged.gamesToPush.length > 0) {
      await syncGamesToCloud(merged.gamesToPush);
    }

    // Update sync status
    await updateSyncStatus({
      lastSyncTimestamp: Date.now(),
    });

    console.log(
      `[Sync] Merge sync complete (pushed ${merged.gamesToPush.length} games, ${merged.scoresToPush.length} scores)`,
    );
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
 * Clear the sync status (on sign-out, so the next account's first sync
 * doesn't inherit this one's state)
 */
export async function clearSyncStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
  } catch (error) {
    console.error("[Sync] Error clearing sync status:", error);
  }
}

// Re-entrancy guard: login transition, app-start path, the 30s retry and the
// post-import sync can overlap; concurrent merge syncs would race each other's
// AsyncStorage writes. Callers share the in-flight run instead.
let inFlightSync: Promise<SyncResult> | null = null;

/**
 * Main sync function: Decides whether to do initial or full sync
 * Includes 60-second timeout to prevent hanging
 * Returns detailed error object instead of throwing
 */
export function syncData(): Promise<SyncResult> {
  if (inFlightSync) {
    console.log("[Sync] Sync already in flight, joining it");
    return inFlightSync;
  }
  inFlightSync = doSyncData().finally(() => {
    inFlightSync = null;
  });
  return inFlightSync;
}

async function doSyncData(): Promise<SyncResult> {
  console.log("[Sync] Starting sync process...");

  try {
    // Add timeout to prevent infinite hanging
    const syncPromise = (async () => {
      const hasInitialSync = await hasPerformedInitialSync();
      console.log("[Sync] Has initial sync:", hasInitialSync);

      if (!hasInitialSync) {
        // First sync on THIS device. If the account already has a profile in
        // the cloud (onboarded on another device, or name set by the admin),
        // adopt it and download — uploading this device's empty state and
        // re-running onboarding would be wrong.
        const cloudProfile = await fetchUserProfileFromCloud().catch(() => null);
        if (cloudProfile?.name) {
          console.log("[Sync] Existing account detected, adopting cloud profile...");
          await AsyncStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(cloudProfile));
          await setOnboardingComplete();
          await updateSyncStatus({ hasInitialSync: true });
          await performFullSync();
        } else {
          console.log("[Sync] Performing initial sync (upload local data)...");
          await performInitialSync();
        }
      } else {
        console.log("[Sync] Performing full sync (download and merge)...");
        await performFullSync();
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

    // Determine if error is retryable based on error type
    const errorMessage = error?.message || "Unknown sync error";
    const status = error?.status;
    const isRetryable =
      (error?.name === "ClientResponseError" && status === 0) || // network-level failure (no response)
      status >= 500 ||
      errorMessage.includes("network") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError");

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
