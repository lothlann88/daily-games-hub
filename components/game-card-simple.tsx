import { StyleSheet, View, Pressable, Image, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getGameIcon } from "@/components/ui/game-icons";
import { Game } from "@/types";

interface GameCardSimpleProps {
  game: Game;
  onPress: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  isPlayedToday: boolean;
}

export function GameCardSimple({
  game,
  onPress,
  onDelete,
  onToggleFavorite,
  isPlayedToday,
}: GameCardSimpleProps) {
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const tintColor = useThemeColor({}, "tint");

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const options = [
      { text: "Cancel", style: "cancel" as const },
    ];

    if (onToggleFavorite) {
      options.unshift({
        text: game.isFavorite ? "Remove from Favorites" : "Add to Favorites",
        style: "default" as const,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleFavorite();
        },
      } as any);
    }

    if (onDelete) {
      options.unshift({
        text: "Delete Game",
        style: "destructive" as const,
        onPress: () => {
          Alert.alert(
            "Delete Game",
            `Are you sure you want to delete "${game.name}"? This will also delete all scores for this game.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onDelete();
                },
              },
            ]
          );
        },
      } as any);
    }

    Alert.alert(game.name, "Choose an action:", options);
  };

  const gameIcon = getGameIcon(game.icon);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: cardBackground,
          borderColor,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={["rgba(124, 58, 237, 0.1)", "rgba(124, 58, 237, 0.05)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {game.logoUrl ? (
            <Image source={{ uri: game.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <View style={styles.iconWrapper}>{gameIcon}</View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {game.name}
            </ThemedText>
            {game.isFavorite && <ThemedText style={styles.favoriteIcon}>⭐</ThemedText>}
          </View>
          <ThemedText style={styles.category}>{game.category}</ThemedText>
        </View>

        <View style={styles.badges}>
          {isPlayedToday && (
            <View style={[styles.badge, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
              <ThemedText style={[styles.badgeText, { color: "#22c55e" }]}>✓</ThemedText>
            </View>
          )}
          {game.currentStreak > 0 && (
            <View style={[styles.badge, { backgroundColor: "rgba(249, 115, 22, 0.15)" }]}>
              <ThemedText style={[styles.badgeText, { color: "#f97316" }]}>
                🔥 {game.currentStreak}
              </ThemedText>
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
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gradientBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 48,
    height: 48,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  favoriteIcon: {
    fontSize: 14,
  },
  category: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
});
