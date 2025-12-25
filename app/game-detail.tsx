import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getGameIcon } from "@/components/ui/game-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGames, usePlayers, useScores } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Score } from "@/types";

export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games } = useGames();
  const { players } = usePlayers();
  const { addScore, getScoresByGame } = useScores();
  const [recentScores, setRecentScores] = useState<Score[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [scoreValue, setScoreValue] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");
  const gradient1 = useThemeColor({}, "gradient1");
  const gradient2 = useThemeColor({}, "gradient2");

  const game = games.find((g) => g.id === gameId);

  useEffect(() => {
    if (players.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(players[0].id);
    }
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (gameId) {
      loadRecentScores();
    }
  }, [gameId]);

  const loadRecentScores = async () => {
    if (!gameId) return;
    const scores = await getScoresByGame(gameId);
    setRecentScores(scores.slice(0, 7));
  };

  const handlePlayGame = async () => {
    if (!game) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await WebBrowser.openBrowserAsync(game.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: tintColor,
      });
    } catch (error) {
      console.error("Error opening game:", error);
    }
  };

  const handleSubmitScore = async () => {
    if (!game || !selectedPlayerId) {
      Alert.alert("Error", "Please select a player");
      return;
    }

    if (!scoreValue.trim()) {
      Alert.alert("Error", "Please enter a score");
      return;
    }

    setLoading(true);
    try {
      const score: Score = {
        id: `${Date.now()}-${Math.random()}`,
        gameId: game.id,
        playerId: selectedPlayerId,
        score: parseFloat(scoreValue) || 0,
        result,
        datePlayed: Date.now(),
        notes: notes.trim() || undefined,
      };

      await addScore(score);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form
      setScoreValue("");
      setNotes("");
      setResult("win");

      // Reload recent scores
      await loadRecentScores();

      Alert.alert("Success", "Score logged successfully!");
    } catch (error) {
      console.error("Error submitting score:", error);
      Alert.alert("Error", "Failed to log score");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (!game) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 20),
            },
          ]}
        >
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={tintColor} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText>Game not found</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const getPlayerById = (playerId: string) => players.find((p) => p.id === playerId);

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
          },
        ]}
      >
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <IconSymbol name="xmark" size={24} color={tintColor} />
        </Pressable>
        <ThemedText type="subtitle">Game Details</ThemedText>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gameInfo}>
          <View style={styles.gameIconContainer}>
            <LinearGradient
              colors={[gradient1, gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gameIconGradient}
            >
              {getGameIcon(game.id, 48, "#FFFFFF")}
            </LinearGradient>
          </View>
          <ThemedText type="title" style={styles.gameName}>
            {game.name}
          </ThemedText>
          <ThemedText style={styles.gameCategory}>{game.category}</ThemedText>
          
          {(game.currentStreak > 0 || game.longestStreak > 0) && (
            <View style={styles.streakInfo}>
              {game.currentStreak > 0 && (
                <View style={styles.streakBadge}>
                  <ThemedText style={styles.streakEmoji}>🔥</ThemedText>
                  <View>
                    <ThemedText style={styles.streakValue}>{game.currentStreak}</ThemedText>
                    <ThemedText style={styles.streakLabel}>Current Streak</ThemedText>
                  </View>
                </View>
              )}
              {game.longestStreak > 0 && (
                <View style={styles.streakBadge}>
                  <ThemedText style={styles.streakEmoji}>🏆</ThemedText>
                  <View>
                    <ThemedText style={styles.streakValue}>{game.longestStreak}</ThemedText>
                    <ThemedText style={styles.streakLabel}>Longest Streak</ThemedText>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <Pressable
          onPress={handlePlayGame}
          style={[styles.playButton, { backgroundColor: tintColor }]}
        >
          <ThemedText style={styles.playButtonText}>Play Now</ThemedText>
        </Pressable>

        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Log Score
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Player</ThemedText>
            <View style={styles.playerSelector}>
              {players.map((player) => (
                <Pressable
                  key={player.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPlayerId(player.id);
                  }}
                  style={[
                    styles.playerButton,
                    { borderColor },
                    selectedPlayerId === player.id && {
                      backgroundColor: player.color,
                      borderColor: player.color,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.playerButtonText,
                      selectedPlayerId === player.id && { color: "#fff" },
                    ]}
                  >
                    {player.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Score</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor, color: tintColor },
              ]}
              value={scoreValue}
              onChangeText={setScoreValue}
              placeholder="Enter score"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Result</ThemedText>
            <View style={styles.resultSelector}>
              {(["win", "loss", "draw"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setResult(r);
                  }}
                  style={[
                    styles.resultButton,
                    { borderColor },
                    result === r && { backgroundColor: tintColor, borderColor: tintColor },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.resultButtonText,
                      result === r && { color: "#fff" },
                    ]}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Notes (optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: inputBackground, borderColor, color: tintColor },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable
            onPress={handleSubmitScore}
            disabled={loading}
            style={[
              styles.submitButton,
              { backgroundColor: tintColor },
              loading && styles.submitButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Submit Score</ThemedText>
            )}
          </Pressable>
        </View>

        {recentScores.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBackground }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Recent Scores
            </ThemedText>
            {recentScores.map((score) => {
              const player = getPlayerById(score.playerId);
              const date = new Date(score.datePlayed);
              return (
                <View key={score.id} style={[styles.scoreRow, { borderColor }]}>
                  <View style={styles.scoreRowLeft}>
                    <View
                      style={[
                        styles.scorePlayerBadge,
                        { backgroundColor: player?.color || "#999" },
                      ]}
                    />
                    <View style={styles.scoreInfo}>
                      <ThemedText type="defaultSemiBold">{player?.name}</ThemedText>
                      <ThemedText style={styles.scoreDate}>
                        {date.toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.scoreRowRight}>
                    <ThemedText type="defaultSemiBold">{score.score}</ThemedText>
                    <ThemedText
                      style={[
                        styles.scoreResult,
                        score.result === "win" && styles.scoreResultWin,
                        score.result === "loss" && styles.scoreResultLoss,
                      ]}
                    >
                      {score.result}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  gameInfo: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 24,
  },
  gameIconContainer: {
    marginBottom: 16,
  },
  gameIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  gameName: {
    textAlign: "center",
  },
  gameCategory: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },
  streakInfo: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  streakEmoji: {
    fontSize: 32,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 24,
  },
  streakLabel: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
  },
  playButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  playButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  playerSelector: {
    flexDirection: "row",
    gap: 8,
  },
  playerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
  },
  playerButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  resultSelector: {
    flexDirection: "row",
    gap: 8,
  },
  resultButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
  },
  resultButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  scoreRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scorePlayerBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreInfo: {
    gap: 2,
  },
  scoreDate: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
  },
  scoreRowRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  scoreResult: {
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  scoreResultWin: {
    color: "#34C759",
  },
  scoreResultLoss: {
    color: "#FF3B30",
  },
});
