import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getGameIcon } from "./ui/game-icons";
import { Game } from "@/types";

interface GameCardProps {
  game: Game;
  onPress: () => void;
  isPlayedToday: boolean;
}

export function GameCard({ game, onPress, isPlayedToday }: GameCardProps) {
  const scale = useSharedValue(1);
  const cardBackground = useThemeColor({ light: "#FFFFFF", dark: "#1F2937" }, "card");
  const borderColor = useThemeColor({ light: "#E5E7EB", dark: "#374151" }, "cardBorder");
  const shadowColor = useThemeColor({}, "shadow");
  const successColor = useThemeColor({ light: "#10B981", dark: "#34D399" }, "success");
  const gradient1 = useThemeColor({}, "gradient1");
  const gradient2 = useThemeColor({}, "gradient2");

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  return (
    <Animated.View style={[animatedStyle, styles.container]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: cardBackground,
            borderColor: borderColor,
            shadowColor: shadowColor,
          },
        ]}
      >
        {/* Icon container with gradient background */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[gradient1, gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            {getGameIcon(game.id, 28, "#FFFFFF")}
          </LinearGradient>
        </View>

        {/* Game info */}
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
            {game.name}
          </ThemedText>
          <ThemedText style={styles.category} numberOfLines={1}>
            {game.category}
          </ThemedText>
        </View>

        {/* Badges */}
        <View style={styles.badges}>
          {game.currentStreak > 0 && (
            <View style={[styles.badge, styles.streakBadge]}>
              <ThemedText style={styles.badgeText}>🔥 {game.currentStreak}</ThemedText>
            </View>
          )}
          {isPlayedToday && (
            <View style={[styles.badge, { backgroundColor: successColor }]}>
              <ThemedText style={styles.badgeText}>✓</ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
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
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 32,
  },
  streakBadge: {
    backgroundColor: "#FF9500",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
