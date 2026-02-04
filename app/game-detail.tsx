import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
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
import { PlayCalendar } from "@/components/play-calendar";
import { PersonalNotes } from "@/components/personal-notes";
import { useGames, useScores } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Score } from "@/types";
import * as friendsLib from "@/lib/friends";
import type { FriendLeaderboardEntry } from "@/types/friends";

export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games } = useGames();
  const { addScore, getScoresByGame } = useScores();
  const [recentScores, setRecentScores] = useState<Score[]>([]);
  const [friendLeaderboard, setFriendLeaderboard] = useState<FriendLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [scoreValue, setScoreValue] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateInput, setTempDateInput] = useState("");
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
    if (gameId) {
      loadRecentScores();
      loadFriendLeaderboard();
    }
  }, [gameId]);

  const loadRecentScores = async () => {
    if (!gameId) return;
    const scores = await getScoresByGame(gameId);
    setRecentScores(scores.slice(0, 7));
  };

  const loadFriendLeaderboard = async () => {
    if (!gameId) return;
    try {
      setLoadingLeaderboard(true);
      const leaderboard = await friendsLib.getFriendLeaderboard(gameId);
      setFriendLeaderboard(leaderboard);
    } catch (error) {
      console.error("Error loading friend leaderboard:", error);
    } finally {
      setLoadingLeaderboard(false);
    }
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
    if (!game) {
      return;
    }

    setFormMessage(null);

    setLoading(true);
    try {
      const parsed = scoreValue.trim() ? parseFloat(scoreValue) : undefined;
      const score: Score = {
        id: `${Date.now()}-${Math.random()}`,
        gameId: game.id,
        ...(parsed !== undefined && !Number.isNaN(parsed) ? { score: parsed } : {}),
        result,
        datePlayed: selectedDate.getTime(),
        notes: notes.trim() || undefined,
      };

      await addScore(score);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload data
      await loadRecentScores();
      await loadFriendLeaderboard();

      // Reset form
      setScoreValue("");
      setNotes("");
      setResult("win");
      setSelectedDate(new Date());

      // Reload recent scores
      await loadRecentScores();

      setFormMessage({ type: "success", text: "Game logged successfully!" });
    } catch (error) {
      console.error("Error submitting score:", error);
      setFormMessage({ type: "error", text: "Failed to log game. Please try again." });
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

        {/* Play History Calendar */}
        <View style={[styles.section, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Play History
          </ThemedText>
          <PlayCalendar
            playHistory={game.playHistory}
            currentStreak={game.currentStreak}
            longestStreak={game.longestStreak}
          />
        </View>

        {/* Personal Notes */}
        <PersonalNotes gameId={game.id} />

        {/* Friend Leaderboard */}
        {friendLeaderboard.length > 1 && (
          <View style={[styles.section, { backgroundColor: cardBackground }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Friend Leaderboard
            </ThemedText>
            {loadingLeaderboard ? (
              <View style={styles.loadingLeaderboard}>
                <ActivityIndicator size="small" color={tintColor} />
              </View>
            ) : (
              friendLeaderboard.map((entry, index) => (
                <View
                  key={entry.user_id}
                  style={[
                    styles.leaderboardRow,
                    { borderColor },
                    entry.is_current_user && { backgroundColor: tintColor + "10" },
                  ]}
                >
                  <View style={styles.leaderboardLeft}>
                    <View style={[styles.rankBadge, index < 3 && { backgroundColor: tintColor }]}>
                      <ThemedText
                        style={[
                          styles.rankText,
                          index < 3 && { color: "#fff", fontWeight: "bold" },
                        ]}
                      >
                        {entry.rank}
                      </ThemedText>
                    </View>
                    <View style={[styles.leaderboardAvatar, { backgroundColor: tintColor }]}>
                      <ThemedText style={styles.leaderboardAvatarText}>
                        {entry.name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.leaderboardInfo}>
                      <ThemedText type="defaultSemiBold">
                        {entry.is_current_user ? "You" : entry.name}
                      </ThemedText>
                      <ThemedText style={styles.leaderboardStats}>
                        {entry.total_plays} {entry.total_plays === 1 ? "play" : "plays"}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.leaderboardRight}>
                    <ThemedText type="defaultSemiBold" style={styles.leaderboardScore}>
                      {entry.best_score !== -Infinity && Number.isFinite(entry.best_score) ? entry.best_score : "—"}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Log Game
          </ThemedText>



          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Date Played</ThemedText>
            <View style={styles.dateSelector}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setSelectedDate(today);
                }}
                style={[
                  styles.dateButton,
                  { borderColor },
                  selectedDate.toDateString() === new Date().toDateString() && {
                    backgroundColor: tintColor,
                    borderColor: tintColor,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dateButtonText,
                    selectedDate.toDateString() === new Date().toDateString() && { color: "#fff" },
                  ]}
                >
                  Today
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  yesterday.setHours(0, 0, 0, 0);
                  setSelectedDate(yesterday);
                }}
                style={[
                  styles.dateButton,
                  { borderColor },
                  (() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return selectedDate.toDateString() === yesterday.toDateString();
                  })() && {
                    backgroundColor: tintColor,
                    borderColor: tintColor,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dateButtonText,
                    (() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return selectedDate.toDateString() === yesterday.toDateString();
                    })() && { color: "#fff" },
                  ]}
                >
                  Yesterday
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTempDateInput(selectedDate.toISOString().split("T")[0]);
                  setShowDatePicker(true);
                }}
                style={[
                  styles.dateButton,
                  { borderColor },
                  selectedDate.toDateString() !== new Date().toDateString() &&
                    (() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return selectedDate.toDateString() !== yesterday.toDateString();
                    })() && {
                      backgroundColor: tintColor,
                      borderColor: tintColor,
                    },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dateButtonText,
                    selectedDate.toDateString() !== new Date().toDateString() &&
                      (() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return selectedDate.toDateString() !== yesterday.toDateString();
                      })() && { color: "#fff" },
                  ]}
                >
                  {selectedDate.toDateString() === new Date().toDateString() ||
                  (() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return selectedDate.toDateString() === yesterday.toDateString();
                  })()
                    ? "Other"
                    : selectedDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Score (optional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor, color: tintColor },
              ]}
              value={scoreValue}
              onChangeText={setScoreValue}
              placeholder="Enter score or leave blank"
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

          {formMessage && (
            <View
              style={[
                styles.formMessage,
                formMessage.type === "success"
                  ? styles.formMessageSuccess
                  : styles.formMessageError,
              ]}
            >
              <ThemedText
                style={[
                  styles.formMessageText,
                  formMessage.type === "success"
                    ? styles.formMessageTextSuccess
                    : styles.formMessageTextError,
                ]}
              >
                {formMessage.text}
              </ThemedText>
            </View>
          )}

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
              <ThemedText style={styles.submitButtonText}>Log Game</ThemedText>
            )}
          </Pressable>
        </View>

        {recentScores.length > 0 && (
          <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Recent Scores
          </ThemedText>
            {recentScores.map((score) => {
              const date = new Date(score.datePlayed);
              return (
                <View key={score.id} style={[styles.scoreRow, { borderColor }]}>
                  <View style={styles.scoreRowLeft}>
                    <View style={styles.scoreInfo}>
                      <ThemedText type="defaultSemiBold">Your Score</ThemedText>
                      <ThemedText style={styles.scoreDate}>
                        {date.toLocaleDateString()}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.scoreRowRight}>
                    <ThemedText type="defaultSemiBold">
                      {score.score !== undefined && score.score !== null ? score.score : "—"}
                    </ThemedText>
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

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Select Date
            </ThemedText>
            <TextInput
              value={tempDateInput}
              onChangeText={setTempDateInput}
              placeholder="YYYY-MM-DD"
              style={[styles.dateInput, { borderColor, color: tintColor }]}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowDatePicker(false)}
                style={[styles.modalButton, { borderColor }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  const date = new Date(tempDateInput);
                  if (!isNaN(date.getTime())) {
                    date.setHours(0, 0, 0, 0);
                    setSelectedDate(date);
                    setShowDatePicker(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } else {
                    setFormMessage({ type: "error", text: "Please enter a valid date in YYYY-MM-DD format" });
                    setShowDatePicker(false);
                  }
                }}
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: tintColor }]}
              >
                <ThemedText style={{ color: "#fff" }}>OK</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  dateSelector: {
    flexDirection: "row",
    gap: 8,
  },
  dateButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  formMessage: {
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  formMessageSuccess: {
    backgroundColor: "rgba(52, 199, 89, 0.15)",
  },
  formMessageError: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
  },
  formMessageText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  formMessageTextSuccess: {
    color: "#34C759",
  },
  formMessageTextError: {
    color: "#FF3B30",
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
  loadingLeaderboard: {
    paddingVertical: 20,
    alignItems: "center",
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  leaderboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "600",
  },
  leaderboardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  leaderboardAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  leaderboardInfo: {
    flex: 1,
    gap: 2,
  },
  leaderboardStats: {
    fontSize: 12,
    opacity: 0.6,
  },
  leaderboardRight: {
    alignItems: "flex-end",
  },
  leaderboardScore: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    gap: 20,
  },
  modalTitle: {
    textAlign: "center",
  },
  dateInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
  },
  modalButtonPrimary: {
    borderWidth: 0,
  },
});
