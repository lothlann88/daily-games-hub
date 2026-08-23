import { Game } from "@/types";
import { daysBetween, startOfDay, uniqueDays } from "@/lib/dates";

/**
 * Calculate the current streak for a game based on its play history
 * A streak is consecutive days the game was played
 */
export function calculateCurrentStreak(playHistory: number[], now: number = Date.now()): number {
  if (playHistory.length === 0) return 0;

  // Unique play days, most recent first.
  const days = uniqueDays(playHistory).reverse();
  if (days.length === 0) return 0;

  // A streak survives until the day after the last play: playing yesterday
  // but not yet today keeps it alive.
  if (daysBetween(days[0], now) > 1) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i], days[i - 1]) !== 1) break;
    streak++;
  }

  return streak;
}

/**
 * Calculate the longest streak from play history
 */
export function calculateLongestStreak(playHistory: number[]): number {
  if (playHistory.length === 0) return 0;

  const days = uniqueDays(playHistory);
  if (days.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Update game streaks after a new play
 */
export function updateGameStreaks(
  game: Game,
  playTimestamp: number,
  now: number = Date.now()
): Game {
  // Add new play to history
  const updatedHistory = [...game.playHistory, playTimestamp];

  // Streaks are relative to today, not to the play being logged — back-dating
  // a play must not resurrect a streak that has already lapsed.
  const currentStreak = calculateCurrentStreak(updatedHistory, now);
  const longestStreak = Math.max(
    calculateLongestStreak(updatedHistory),
    game.longestStreak
  );

  return {
    ...game,
    playHistory: updatedHistory,
    currentStreak,
    longestStreak,
    lastPlayed: playTimestamp,
  };
}

/**
 * Check if a game was played today
 */
export function wasPlayedToday(game: Game, now: number = Date.now()): boolean {
  if (!game.lastPlayed) return false;
  return startOfDay(now) === startOfDay(game.lastPlayed);
}
