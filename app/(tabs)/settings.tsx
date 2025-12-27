import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { usePreferences, useGames, useScores } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as notificationLib from "@/lib/notifications";
import * as dataTransfer from "@/lib/data-transfer";
import { getUserProfile, updateUserProfile } from "@/lib/storage";
import { UserProfile } from "@/types";
import { useAuth } from "@/contexts/auth-context";

export default function SettingsScreen() {
  const { preferences, loading: prefsLoading, updatePreferences } = usePreferences();
  const { refresh: refreshGames } = useGames();
  const { refresh: refreshScores } = useScores();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const textColor = useThemeColor({}, "text");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await getUserProfile();
    setUserProfile(profile);
    setProfileLoading(false);
  };

  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await dataTransfer.exportAndShare();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Export Failed", "Failed to export data. Please try again.");
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      "Import Data",
      "Choose how to import:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Replace All",
          style: "destructive",
          onPress: async () => {
            try {
              await dataTransfer.pickAndImportData();
              await refreshGames();
              await refreshScores();
              await loadUserProfile();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Data imported successfully!");
            } catch (error) {
              Alert.alert("Import Failed", "Failed to import data. Please check the file format.");
            }
          },
        },
        {
          text: "Merge",
          onPress: async () => {
            try {
              const result = await dataTransfer.pickAndImportData();
              await refreshGames();
              await refreshScores();
              await loadUserProfile();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Data merged successfully!");
            } catch (error) {
              Alert.alert("Import Failed", "Failed to import data. Please check the file format.");
            }
          },
        },
      ]
    );
  };

  const handleEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.prompt(
      "Edit Your Name",
      "Enter your name",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async (newName?: string) => {
            if (newName && newName.trim()) {
              await updateUserProfile({ name: newName.trim() });
              await loadUserProfile();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
      "plain-text",
      userProfile?.name || ""
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

  const loading = prefsLoading || profileLoading;

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

        {/* User Profile Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your Profile
          </ThemedText>
          <Pressable
            onPress={handleEditName}
            style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
          >
            <View style={styles.settingRowLeft}>
              <View style={[styles.avatarBadge, { backgroundColor: tintColor }]}>
                <ThemedText style={styles.avatarText}>
                  {userProfile?.name?.charAt(0).toUpperCase() || "?"}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{userProfile?.name || "User"}</ThemedText>
                <ThemedText style={styles.settingDescription}>Tap to edit your name</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.settingRowRight}>Edit</ThemedText>
          </Pressable>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Notifications
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.settingRowLeft}>
              <ThemedText type="defaultSemiBold">Daily Reminders</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Get reminded to play your daily games
              </ThemedText>
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

        {/* Data Management */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data Management
          </ThemedText>
          <Pressable
            onPress={handleExportData}
            style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
          >
            <View style={styles.settingRowLeft}>
              <ThemedText>Export Data</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Backup all your games, scores, and settings
              </ThemedText>
            </View>
            <ThemedText style={{ color: tintColor }}>Share</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleImportData}
            style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
          >
            <View style={styles.settingRowLeft}>
              <ThemedText>Import Data</ThemedText>
              <ThemedText style={styles.settingDescription}>
                Restore from a backup file
              </ThemedText>
            </View>
            <ThemedText style={{ color: tintColor }}>Import</ThemedText>
          </Pressable>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Account
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.settingRowLeft}>
              <ThemedText>Email</ThemedText>
              <ThemedText style={styles.settingDescription}>
                {user?.email || "Not signed in"}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out? Your data is safely synced to the cloud.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                      await signOut();
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ]
              );
            }}
            style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}
          >
            <ThemedText style={{ color: "#FF3B30" }}>Sign Out</ThemedText>
          </Pressable>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            About
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.settingRowLeft}>
              <ThemedText>Version</ThemedText>
            </View>
            <ThemedText style={styles.settingRowRight}>2.0.0</ThemedText>
          </View>
          <View style={[styles.infoCard, { backgroundColor: cardBackground }]}>
            <ThemedText style={styles.infoText}>
              Daily Games Hub helps you track all your favorite daily games in one place.
              Build streaks, track your stats, and compete with friends!
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
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.6,
  },
  settingRowRight: {
    fontSize: 14,
    opacity: 0.6,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
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
