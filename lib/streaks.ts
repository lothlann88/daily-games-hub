import { Game } from "@/types";

/**
 * Calculate the current streak for a game based on its play history
 * A streak is consecutive days the game was played
 */
export function calculateCurrentStreak(playHistory: number[], now: number = Date.now()): number {
  if (playHistory.length === 0) return 0;

  // Sort play history in descending order (most recent first)
  const sortedHistory = [...playHistory].sort((a, b) => b - a);

  // Get unique days (ignore multiple plays on same day)
  const uniqueDays = getUniqueDays(sortedHistory);

  if (uniqueDays.length === 0) return 0;

  // Check if the most recent play was today or yesterday
  const today = getStartOfDay(now);
  const mostRecentDay = uniqueDays[0];
  const daysSinceLastPlay = Math.floor((today - mostRecentDay) / (24 * 60 * 60 * 1000));

  // If last play was more than 1 day ago, streak is broken
  if (daysSinceLastPlay > 1) return 0;

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const dayDiff = Math.floor((uniqueDays[i - 1] - uniqueDays[i]) / (24 * 60 * 60 * 1000));
    if (dayDiff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the longest streak from play history
 */
export function calculateLongestStreak(playHistory: number[]): number {
  if (playHistory.length === 0) return 0;

  const uniqueDays = getUniqueDays(playHistory);
  if (uniqueDays.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDays.length; i++) {
    const dayDiff = Math.floor((uniqueDays[i - 1] - uniqueDays[i]) / (24 * 60 * 60 * 1000));
    if (dayDiff === 1) {
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
export function updateGameStreaks(game: Game, playTimestamp: number): Game {
  // Add new play to history
  const updatedHistory = [...game.playHistory, playTimestamp];

  // Calculate new streaks
  const currentStreak = calculateCurrentStreak(updatedHistory);
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
 * Get unique days from timestamps (start of day)
 */
function getUniqueDays(timestamps: number[]): number[] {
  const days = timestamps.map((ts) => getStartOfDay(ts));
  const uniqueDays = [...new Set(days)];
  return uniqueDays.sort((a, b) => b - a); // Sort descending
}

/**
 * Get start of day timestamp (midnight)
 */
function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Check if a game was played today
 */
export function wasPlayedToday(game: Game): boolean {
  if (!game.lastPlayed) return false;
  const today = getStartOfDay(Date.now());
  const lastPlayedDay = getStartOfDay(game.lastPlayed);
  return today === lastPlayedDay;
}
