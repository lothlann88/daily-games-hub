import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";
import { Game } from "@/types";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as Haptics from "expo-haptics";

interface GameCardProps {
  game: Game;
  onPress: () => void;
  isPlayedToday?: boolean;
}

export function GameCard({ game, onPress, isPlayedToday }: GameCardProps) {
  const cardBackground = useThemeColor({}, "background");
  const borderColor = useThemeColor({ light: "#E5E5EA", dark: "#38383A" }, "background");
  const successColor = "#34C759";

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: cardBackground, borderColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ThemedText style={styles.icon}>{game.icon}</ThemedText>
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.name}>
            {game.name}
          </ThemedText>
          <ThemedText style={styles.category}>{game.category}</ThemedText>
        </View>
        <View style={styles.badges}>
          {game.currentStreak > 0 && (
            <View style={[styles.badge, { backgroundColor: "#FF9500" }]}>
              <ThemedText style={styles.badgeText}>🔥 {game.currentStreak}</ThemedText>
            </View>
          )}
          {isPlayedToday && (
            <View style={[styles.badge, { backgroundColor: successColor }]}>
              <ThemedText style={styles.badgeText}>✓</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 80,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
  },
  category: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.6,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
