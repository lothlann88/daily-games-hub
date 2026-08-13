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
  // Scores are append-only records with client-generated ids: union by id.
  const cloudScoreIds = new Set(cloud.scores.map((s) => s.id));
  const scoresToPush = local.scores.filter((s) => !cloudScoreIds.has(s.id));
  const scores = [...cloud.scores, ...scoresToPush];

  const scoreDatesByGame = new Map<string, number[]>();
  for (const score of scores) {
    const dates = scoreDatesByGame.get(score.gameId);
    if (dates) dates.push(score.datePlayed);
    else scoreDatesByGame.set(score.gameId, [score.datePlayed]);
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
    const playHistory = [
      ...new Set([
        ...(localGame?.playHistory ?? []),
        ...(cloudGame?.playHistory ?? []),
        ...(scoreDatesByGame.get(id) ?? []),
      ]),
    ].sort((a, b) => a - b);

    const merged: Game = {
      ...base,
      playHistory,
      ...(playHistory.length > 0
        ? { lastPlayed: playHistory[playHistory.length - 1] }
        : {}),
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
