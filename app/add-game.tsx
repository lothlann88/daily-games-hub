import { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getGameIcon } from "@/components/ui/game-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useGames } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { CATEGORIES } from "@/lib/categories";
import { Game, GameCategory, ScoreOrder } from "@/types";

const SCORE_ORDER_OPTIONS: { value: ScoreOrder; label: string }[] = [
  { value: "higher", label: "Higher is better" },
  { value: "lower", label: "Lower is better" },
  { value: "none", label: "No score" },
];
const EMOJI_OPTIONS = ["🎮", "🎯", "🎲", "🧩", "🔤", "📰", "👑", "📍", "🔗", "🐝", "🔢", "🎪", "🎨", "🎭", "🎬"];

export default function AddGameScreen() {
  const { addGame } = useGames();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<GameCategory>("Word Games");
  const [scoreOrder, setScoreOrder] = useState<ScoreOrder>("higher");
  const [icon, setIcon] = useState("🎮");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");
  const gradient1 = useThemeColor({}, "gradient1");
  const gradient2 = useThemeColor({}, "gradient2");

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a game name");
      return;
    }

    if (!url.trim()) {
      Alert.alert("Error", "Please enter a game URL");
      return;
    }

    // Basic URL validation
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      Alert.alert("Error", "URL must start with http:// or https://");
      return;
    }

    setLoading(true);
    try {
      const newGame: Game = {
        id: `game-${Date.now()}`,
        name: name.trim(),
        url: url.trim(),
        category,
        scoreOrder,
        icon,
        dateAdded: Date.now(),
        currentStreak: 0,
        longestStreak: 0,
        playHistory: [],
        isFavorite: false,
        tags: [],
      };

      await addGame(newGame);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Game added successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error adding game:", error);
      Alert.alert("Error", "Failed to add game");
    } finally {
      setLoading(false);
    }
  };

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
        <ThemedText type="subtitle">Add Game</ThemedText>
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
        <View style={[styles.section, { backgroundColor: cardBackground }]}>
          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Game Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor, color: tintColor },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Wordle"
              placeholderTextColor="#999"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>URL *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor, color: tintColor },
              ]}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/game"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat);
                  }}
                  style={[
                    styles.categoryButton,
                    { borderColor },
                    category === cat && {
                      backgroundColor: tintColor,
                      borderColor: tintColor,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryButtonText,
                      category === cat && { color: "#fff" },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Scoring</ThemedText>
            <View style={styles.categoryGrid}>
              {SCORE_ORDER_OPTIONS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setScoreOrder(value);
                  }}
                  style={[
                    styles.categoryButton,
                    { borderColor },
                    scoreOrder === value && {
                      backgroundColor: tintColor,
                      borderColor: tintColor,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.categoryButtonText,
                      scoreOrder === value && { color: "#fff" },
                    ]}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.helperText}>
              Whether a bigger number (points) or a smaller one (guesses, time)
              is the better result. Used to rank head-to-head.
            </ThemedText>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Icon</ThemedText>
            <View style={styles.iconGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIcon(emoji);
                  }}
                  style={[
                    styles.iconButton,
                    { borderColor },
                    icon === emoji && {
                      backgroundColor: tintColor,
                      borderColor: tintColor,
                    },
                  ]}
                >
                  <ThemedText style={styles.iconEmoji}>{emoji}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.previewSection, { backgroundColor: cardBackground }]}>
          <ThemedText type="subtitle" style={styles.previewTitle}>
            Preview
          </ThemedText>
          <View style={[styles.previewCard, { borderColor }]}>
            <View style={styles.previewIconContainer}>
              <LinearGradient
                colors={[gradient1, gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.previewIconGradient}
              >
                <ThemedText style={styles.previewIcon}>{icon}</ThemedText>
              </LinearGradient>
            </View>
            <View style={styles.previewInfo}>
              <ThemedText type="defaultSemiBold" style={styles.previewName}>
                {name || "Game Name"}
              </ThemedText>
              <ThemedText style={styles.previewCategory}>{category}</ThemedText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
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
            <ThemedText style={styles.submitButtonText}>Add Game</ThemedText>
          )}
        </Pressable>
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  iconEmoji: {
    fontSize: 28,
  },
  previewSection: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  previewTitle: {
    marginBottom: 4,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewIconContainer: {
    marginRight: 12,
  },
  previewIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  previewIcon: {
    fontSize: 28,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  previewName: {
    fontSize: 17,
    lineHeight: 22,
  },
  previewCategory: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.6,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
