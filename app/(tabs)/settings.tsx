import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { usePlayers, usePreferences } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as notificationLib from "@/lib/notifications";

export default function SettingsScreen() {
  const { players, loading: playersLoading, updatePlayer } = usePlayers();
  const { preferences, loading: prefsLoading, updatePreferences } = usePreferences();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({ light: "#F2F2F7", dark: "#1C1C1E" }, "background");
  const borderColor = useThemeColor({ light: "#E5E5EA", dark: "#38383A" }, "background");

  const loading = playersLoading || prefsLoading;

  const handleEditPlayer = (playerId: string, currentName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt(
      "Edit Player Name",
      "Enter a new name for this player",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newName?: string) => {
            if (newName && newName.trim()) {
              await updatePlayer(playerId, { name: newName.trim() });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
      "plain-text",
      currentName
    );
  };

  const handleToggleReminders = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (value) {
      // Request permissions
      const granted = await notificationLib.requestPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive daily reminders."
        );
        return;
      }
      
      // Schedule notification with current reminder time
      if (preferences) {
        const { hour, minute } = notificationLib.parseTimeString(preferences.reminderTime);
        await notificationLib.scheduleDailyReminder(hour, minute);
        await updatePreferences({ remindersEnabled: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      // Cancel all reminders
      await notificationLib.cancelAllReminders();
      if (preferences) {
        await updatePreferences({ remindersEnabled: false });
      }
    }
  };

  const handleChangeReminderTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt(
      "Set Reminder Time",
      "Enter time in HH:MM format (24-hour)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newTime?: string) => {
            if (newTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
              if (preferences) {
                await updatePreferences({ reminderTime: newTime });
                
                // Reschedule if reminders are enabled
                if (preferences.remindersEnabled) {
                  const { hour, minute } = notificationLib.parseTimeString(newTime);
                  await notificationLib.scheduleDailyReminder(hour, minute);
                }
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } else {
              Alert.alert("Invalid Format", "Please use HH:MM format (e.g., 09:00 or 14:30)");
            }
          },
        },
      ],
      "plain-text",
      preferences?.reminderTime || "09:00"
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

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
          <ThemedText type="title">Settings</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Players
          </ThemedText>
          {players.map((player) => (
            <Pressable
              key={player.id}
              onPress={() => handleEditPlayer(player.id, player.name)}
              style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
            >
              <View style={styles.settingRowLeft}>
                <View style={[styles.playerBadge, { backgroundColor: player.color }]}>
                  <ThemedText style={styles.playerBadgeText}>
                    {player.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold">{player.name}</ThemedText>
              </View>
              <ThemedText style={styles.settingRowRight}>Edit</ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.settingRowLeft}>
              <ThemedText type="defaultSemiBold">Daily Reminders</ThemedText>
            </View>
            <Switch
              value={preferences?.remindersEnabled || false}
              onValueChange={handleToggleReminders}
              trackColor={{ false: "#E5E5EA", true: tintColor }}
              thumbColor="#fff"
            />
          </View>
          {preferences?.remindersEnabled && (
            <Pressable
              onPress={handleChangeReminderTime}
              style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
            >
              <View style={styles.settingRowLeft}>
                <ThemedText>Reminder Time</ThemedText>
              </View>
              <ThemedText style={styles.settingRowRight}>
                {preferences.reminderTime}
              </ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.settingRowLeft}>
              <ThemedText>Version</ThemedText>
            </View>
            <ThemedText style={styles.settingRowRight}>1.0.0</ThemedText>
          </View>
          <View style={[styles.infoCard, { backgroundColor: cardBackground }]}>
            <ThemedText style={styles.infoText}>
              Daily Games Hub helps you keep track of all your favorite daily games in one place.
              Play games, log scores, and compete with friends!
            </ThemedText>
          </View>
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
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingRowRight: {
    fontSize: 14,
    opacity: 0.6,
  },
  playerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  playerBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});
