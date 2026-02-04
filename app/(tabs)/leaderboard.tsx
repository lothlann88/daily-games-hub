import { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useScores, useGames } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";

type TimePeriod = "week" | "month" | "all";

export default function StatsScreen() {
  const { scores, loading: scoresLoading } = useScores();
  const { games, loading: gamesLoading } = useGames();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all");
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");

  const loading = scoresLoading || gamesLoading;

  const filteredScores = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    return scores.filter((score) => {
      if (timePeriod === "week") return now - score.datePlayed < oneWeek;
      if (timePeriod === "month") return now - score.datePlayed < oneMonth;
      return true;
    });
  }, [scores, timePeriod]);

  const stats = useMemo(() => {
    const wins = filteredScores.filter((s) => s.result === "win").length;
    const losses = filteredScores.filter((s) => s.result === "loss").length;
    const draws = filteredScores.filter((s) => s.result === "draw").length;
    const total = filteredScores.length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

    return { wins, losses, draws, total, winRate };
  }, [filteredScores]);

  const gameStats = useMemo(() => {
    const gameScores: Record<string, { wins: number; total: number; lastPlayed?: number }> = {};

    games.forEach((game) => {
      gameScores[game.id] = { wins: 0, total: 0 };
    });

    filteredScores.forEach((score) => {
      if (gameScores[score.gameId]) {
        gameScores[score.gameId].total++;
        if (score.result === "win") {
          gameScores[score.gameId].wins++;
        }
        if (!gameScores[score.gameId].lastPlayed || score.datePlayed > gameScores[score.gameId].lastPlayed!) {
          gameScores[score.gameId].lastPlayed = score.datePlayed;
        }
      }
    });

    return gameScores;
  }, [filteredScores, games]);

  const activeStreaks = useMemo(() => {
    return games
      .filter((game) => game.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak);
  }, [games]);

  const recordedGamesLog = useMemo(() => {
    return [...filteredScores]
      .map((score) => ({
        ...score,
        gameName: games.find((g) => g.id === score.gameId)?.name ?? "Unknown game",
      }))
      .sort((a, b) => b.datePlayed - a.datePlayed);
  }, [filteredScores, games]);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={tintColor} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        <ThemedText type="title" style={styles.title}>
          Your Stats
        </ThemedText>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "all"] as TimePeriod[]).map((period) => (
            <Pressable
              key={period}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimePeriod(period);
              }}
              style={[
                styles.periodButton,
                { borderColor: tintColor },
                timePeriod === period && { backgroundColor: tintColor },
              ]}
            >
              <ThemedText
                style={[
                  styles.periodButtonText,
                  timePeriod === period && { color: "#fff" },
                ]}
              >
                {period === "week" ? "This Week" : period === "month" ? "This Month" : "All Time"}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Overall Stats */}
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Overall Performance
          </ThemedText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: tintColor }]}>
                {stats.total}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Games Played</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: "#10B981" }]}>
                {stats.wins}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Wins</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: "#EF4444" }]}>
                {stats.losses}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Losses</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: "#F59E0B" }]}>
                {stats.draws}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Draws</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: tintColor }]}>
                {stats.winRate}%
              </ThemedText>
              <ThemedText style={styles.statLabel}>Win Rate</ThemedText>
            </View>
          </View>
        </View>

        {/* Active Streaks */}
        {activeStreaks.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBackground }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🔥 Active Streaks
            </ThemedText>
            {activeStreaks.map((game) => (
              <View key={game.id} style={styles.streakRow}>
                <ThemedText type="defaultSemiBold">{game.name}</ThemedText>
                <ThemedText style={[styles.streakValue, { color: tintColor }]}>
                  {game.currentStreak} days
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Recorded games log */}
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recorded Games
          </ThemedText>
          {recordedGamesLog.length === 0 ? (
            <ThemedText style={styles.emptyLog}>No games recorded for this period.</ThemedText>
          ) : (
            recordedGamesLog.map((entry) => {
              const date = new Date(entry.datePlayed);
              const resultColor =
                entry.result === "win" ? "#10B981" : entry.result === "loss" ? "#EF4444" : "#F59E0B";
              return (
                <View key={entry.id} style={styles.logRow}>
                  <View style={styles.logMain}>
                    <ThemedText type="defaultSemiBold">{entry.gameName}</ThemedText>
                    <ThemedText style={styles.logDate}>{date.toLocaleDateString()}</ThemedText>
                  </View>
                  <View style={styles.logMeta}>
                    <ThemedText style={[styles.logResult, { color: resultColor }]}>
                      {entry.result.charAt(0).toUpperCase() + entry.result.slice(1)}
                    </ThemedText>
                    <ThemedText style={styles.logScore}>
                      {entry.score !== undefined && entry.score !== null ? entry.score : "—"}
                    </ThemedText>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Game Breakdown */}
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Game Breakdown
          </ThemedText>
          {games.map((game) => {
            const stats = gameStats[game.id];
            if (!stats || stats.total === 0) return null;

            const winRate = ((stats.wins / stats.total) * 100).toFixed(0);

            return (
              <View key={game.id} style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <ThemedText type="defaultSemiBold">{game.name}</ThemedText>
                  <ThemedText style={styles.gameCardSubtext}>
                    {stats.total} {stats.total === 1 ? "game" : "games"}
                  </ThemedText>
                </View>
                <View style={styles.gameCardStats}>
                  <View style={styles.gameStatItem}>
                    <ThemedText style={[styles.gameStatValue, { color: "#10B981" }]}>
                      {stats.wins}
                    </ThemedText>
                    <ThemedText style={styles.gameStatLabel}>Wins</ThemedText>
                  </View>
                  <View style={styles.gameStatItem}>
                    <ThemedText style={[styles.gameStatValue, { color: tintColor }]}>
                      {winRate}%
                    </ThemedText>
                    <ThemedText style={styles.gameStatLabel}>Win Rate</ThemedText>
                  </View>
                  {game.currentStreak > 0 && (
                    <View style={styles.gameStatItem}>
                      <ThemedText style={[styles.gameStatValue, { color: "#F59E0B" }]}>
                        🔥 {game.currentStreak}
                      </ThemedText>
                      <ThemedText style={styles.gameStatLabel}>Streak</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
    minWidth: "30%",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  streakValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  gameCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  gameCardHeader: {
    marginBottom: 8,
  },
  gameCardSubtext: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  gameCardStats: {
    flexDirection: "row",
    gap: 24,
  },
  gameStatItem: {
    alignItems: "center",
  },
  gameStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  gameStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyLog: {
    fontSize: 14,
    opacity: 0.7,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  logMain: {
    flex: 1,
  },
  logDate: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logResult: {
    fontSize: 14,
    fontWeight: "600",
  },
  logScore: {
    fontSize: 14,
    opacity: 0.8,
    minWidth: 28,
    textAlign: "right",
  },
});
