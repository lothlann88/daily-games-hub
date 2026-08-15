import { calculateCurrentStreak, calculateLongestStreak } from "@/lib/streaks";
import type { Game, Score } from "@/types";

// Pure two-way merge between the local library and the cloud copy — the core
// of sync (lib/sync.ts performFullSync). No storage or network imports so the
// whole algorithm is unit-testable over plain arrays.
//
// Clock model: per-game last-write-wins on a client-set updatedAt (epoch ms),
// falling back to dateAdded for records that predate the field. Pure LWW on
// client clocks is acceptable here: two users on NTP-synced personal devices,
// where clock skew is dwarfed by human edit cadence.

export interface LibrarySnapshot {
  games: Game[];
  scores: Score[];
}

export interface MergeResult {
  games: Game[]; // merged library, play-derived fields recomputed
  scores: Score[]; // union of both sides
  gamesToPush: Game[]; // records the cloud is missing or has stale
  scoresToPush: Score[]; // local-only scores
}

/** LWW clock with legacy fallback. */
function effectiveUpdatedAt(game: Game): number {
  return game.updatedAt ?? game.dateAdded ?? 0;
}

export function mergeLibraries(
  local: LibrarySnapshot,
  cloud: LibrarySnapshot,
  now: number = Date.now()
): MergeResult {
  // Scores: union by id; when both sides hold a score, the newer edit
  // (updatedAt, 0 when never edited) wins, ties to cloud. Deleted scores are
  // tombstones — kept in the merged set so the deletion propagates, filtered
  // out of every read path by lib/storage.ts.
  const cloudScoresById = new Map(cloud.scores.map((s) => [s.id, s]));
  const scores: Score[] = [];
  const scoresToPush: Score[] = [];
  const localScoreIds = new Set(local.scores.map((s) => s.id));
  for (const localScore of local.scores) {
    const cloudScore = cloudScoresById.get(localScore.id);
    if (!cloudScore) {
      scores.push(localScore);
      scoresToPush.push(localScore);
    } else if ((localScore.updatedAt ?? 0) > (cloudScore.updatedAt ?? 0)) {
      scores.push(localScore);
      scoresToPush.push(localScore);
    } else {
      scores.push(cloudScore);
    }
  }
  for (const cloudScore of cloud.scores) {
    if (!localScoreIds.has(cloudScore.id)) scores.push(cloudScore);
  }

  // Active scores contribute their timestamps to play history; tombstoned
  // ones subtract theirs — even from a stale game record's stored history.
  // (Two distinct plays sharing an exact millisecond could collide here;
  // separate log actions make that practically impossible.)
  const scoreDatesByGame = new Map<string, number[]>();
  const deletedDatesByGame = new Map<string, Set<number>>();
  for (const score of scores) {
    if (score.deleted) {
      const dates = deletedDatesByGame.get(score.gameId);
      if (dates) dates.add(score.datePlayed);
      else deletedDatesByGame.set(score.gameId, new Set([score.datePlayed]));
    } else {
      const dates = scoreDatesByGame.get(score.gameId);
      if (dates) dates.push(score.datePlayed);
      else scoreDatesByGame.set(score.gameId, [score.datePlayed]);
    }
  }

  const localById = new Map(local.games.map((g) => [g.id, g]));
  const cloudById = new Map(cloud.games.map((g) => [g.id, g]));
  const allIds = [...new Set([...local.games, ...cloud.games].map((g) => g.id))];

  const games: Game[] = [];
  const gamesToPush: Game[] = [];

  for (const id of allIds) {
    const localGame = localById.get(id);
    const cloudGame = cloudById.get(id);

    // Metadata winner. Local-only records upload (this is what keeps games
    // added offline, logo backfills and imports from vanishing); cloud-only
    // records are adopted; when both exist the newer updatedAt wins, ties to
    // cloud so an un-stamped no-op never generates a push.
    let base: Game;
    let pushForMetadata: boolean;
    if (localGame && cloudGame) {
      const localWins = effectiveUpdatedAt(localGame) > effectiveUpdatedAt(cloudGame);
      base = localWins ? localGame : cloudGame;
      pushForMetadata = localWins;
    } else {
      base = (localGame ?? cloudGame)!;
      pushForMetadata = Boolean(localGame);
    }

    // Play-derived fields are recomputed from the union of both histories and
    // the merged scores — never trusted from either record. This is what makes
    // two devices logging plays independently both count: the other side's
    // score contributes its timestamp regardless of which record won LWW.
    const deletedDates = deletedDatesByGame.get(id);
    const playHistory = [
      ...new Set([
        ...(localGame?.playHistory ?? []),
        ...(cloudGame?.playHistory ?? []),
        ...(scoreDatesByGame.get(id) ?? []),
      ]),
    ]
      .filter((ts) => !deletedDates?.has(ts))
      .sort((a, b) => a - b);

    const merged: Game = {
      ...base,
      playHistory,
      // undefined (not the base's stale value) when every play was deleted;
      // JSON serialisation drops the key.
      lastPlayed:
        playHistory.length > 0 ? playHistory[playHistory.length - 1] : undefined,
      currentStreak: calculateCurrentStreak(playHistory, now),
      longestStreak: Math.max(
        calculateLongestStreak(playHistory),
        localGame?.longestStreak ?? 0,
        cloudGame?.longestStreak ?? 0
      ),
    };
    games.push(merged);

    // Push when local metadata won, or when the recompute moved the play
    // fields off what the cloud has stored — friends' head-to-head reads the
    // cloud copy's streaks, so it must converge too.
    const playFieldsDiverge =
      !cloudGame ||
      cloudGame.currentStreak !== merged.currentStreak ||
      cloudGame.longestStreak !== merged.longestStreak ||
      cloudGame.playHistory.length !== merged.playHistory.length;
    if (pushForMetadata || playFieldsDiverge) {
      gamesToPush.push(merged);
    }
  }

  return { games, scores, gamesToPush, scoresToPush };
}
