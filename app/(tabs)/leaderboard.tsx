import { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useScores, usePlayers, useGames } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Score } from "@/types";

type TimePeriod = "week" | "month" | "all";

export default function LeaderboardScreen() {
  const { scores, loading: scoresLoading } = useScores();
  const { players, loading: playersLoading } = usePlayers();
  const { games, loading: gamesLoading } = useGames();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({ light: "#F2F2F7", dark: "#1C1C1E" }, "background");

  const loading = scoresLoading || playersLoading || gamesLoading;

  const filteredScores = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    switch (timePeriod) {
      case "week":
        return scores.filter((s) => now - s.datePlayed < 7 * dayMs);
      case "month":
        return scores.filter((s) => now - s.datePlayed < 30 * dayMs);
      default:
        return scores;
    }
  }, [scores, timePeriod]);

  const stats = useMemo(() => {
    const playerStats: Record<string, { wins: number; total: number }> = {};

    players.forEach((player) => {
      playerStats[player.id] = { wins: 0, total: 0 };
    });

    filteredScores.forEach((score) => {
      if (playerStats[score.playerId]) {
        playerStats[score.playerId].total++;
        if (score.result === "win") {
          playerStats[score.playerId].wins++;
        }
      }
    });

    return playerStats;
  }, [filteredScores, players]);

  const gameStats = useMemo(() => {
    const gameScores: Record<string, Record<string, number>> = {};

    games.forEach((game) => {
      gameScores[game.id] = {};
      players.forEach((player) => {
        gameScores[game.id][player.id] = 0;
      });
    });

    filteredScores.forEach((score) => {
      if (gameScores[score.gameId] && score.result === "win") {
        gameScores[score.gameId][score.playerId]++;
      }
    });

    return gameScores;
  }, [filteredScores, games, players]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  const TimePeriodButton = ({ period, label }: { period: TimePeriod; label: string }) => (
    <Pressable
      onPress={() => setTimePeriod(period)}
      style={[
        styles.periodButton,
        timePeriod === period && { backgroundColor: tintColor },
      ]}
    >
      <ThemedText
        style={[
          styles.periodButtonText,
          timePeriod === period && { color: "#fff" },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title">Leaderboard</ThemedText>
        </View>

        <View style={styles.periodSelector}>
          <TimePeriodButton period="week" label="Week" />
          <TimePeriodButton period="month" label="Month" />
          <TimePeriodButton period="all" label="All Time" />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Overall Stats
          </ThemedText>
          {players.map((player) => (
            <View
              key={player.id}
              style={[styles.statCard, { backgroundColor: cardBackground }]}
            >
              <View style={styles.statCardHeader}>
                <View style={[styles.playerBadge, { backgroundColor: player.color }]}>
                  <ThemedText style={styles.playerBadgeText}>
                    {player.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={styles.playerName}>
                  {player.name}
                </ThemedText>
              </View>
              <View style={styles.statCardContent}>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statValue}>
                    {stats[player.id]?.wins || 0}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Wins</ThemedText>
                </View>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statValue}>
                    {stats[player.id]?.total || 0}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Games Played</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {games.length > 0 && filteredScores.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Game Breakdown
            </ThemedText>
            {games.map((game) => {
              const hasScores = players.some(
                (player) => gameStats[game.id]?.[player.id] > 0
              );
              if (!hasScores) return null;

              return (
                <View
                  key={game.id}
                  style={[styles.gameCard, { backgroundColor: cardBackground }]}
                >
                  <View style={styles.gameCardHeader}>
                    <ThemedText style={styles.gameIcon}>{game.icon}</ThemedText>
                    <ThemedText type="defaultSemiBold">{game.name}</ThemedText>
                  </View>
                  <View style={styles.gameCardScores}>
                    {players.map((player) => (
                      <View key={player.id} style={styles.gameScoreItem}>
                        <View
                          style={[
                            styles.gameScoreBadge,
                            { backgroundColor: player.color },
                          ]}
                        />
                        <ThemedText style={styles.gameScoreText}>
                          {player.name}: {gameStats[game.id]?.[player.id] || 0} wins
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {games.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Active Streaks
            </ThemedText>
            {games
              .filter((game) => game.currentStreak > 0)
              .sort((a, b) => b.currentStreak - a.currentStreak)
              .map((game) => (
                <View
                  key={game.id}
                  style={[styles.streakCard, { backgroundColor: cardBackground }]}
                >
                  <View style={styles.streakCardLeft}>
                    <ThemedText style={styles.streakGameIcon}>{game.icon}</ThemedText>
                    <ThemedText type="defaultSemiBold">{game.name}</ThemedText>
                  </View>
                  <View style={styles.streakCardRight}>
                    <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
                    <ThemedText style={styles.streakValue}>{game.currentStreak}</ThemedText>
                  </View>
                </View>
              ))}
            {games.every((game) => game.currentStreak === 0) && (
              <View style={styles.emptyStreakContainer}>
                <ThemedText style={styles.emptyStreakText}>
                  No active streaks yet. Start playing daily to build streaks!
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {filteredScores.length === 0 && (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No scores yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Play some games and log your scores to see stats here
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    paddingBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    alignItems: "center",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  playerBadgeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  playerName: {
    fontSize: 17,
  },
  statCardContent: {
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
  },
  gameCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  gameCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gameIcon: {
    fontSize: 20,
  },
  gameCardScores: {
    gap: 8,
  },
  gameScoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gameScoreBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  gameScoreText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    textAlign: "center",
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  streakCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  streakGameIcon: {
    fontSize: 24,
  },
  streakCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 24,
  },
  emptyStreakContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStreakText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    textAlign: "center",
  },
});
