import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import Constants from "expo-constants";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FeedbackBanner, type FeedbackState } from "@/components/feedback-banner";
import { CHANGELOG } from "@/lib/changelog";
import { usePreferences, useGames, useScores } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as dataTransfer from "@/lib/data-transfer";
import { getUserProfile, updateUserProfile } from "@/lib/storage";
import { syncUserProfile } from "@/lib/sync";
import { UserProfile } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useThemePreference, type ThemePreference } from "@/contexts/theme-context";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { loading: prefsLoading } = usePreferences();
  const { refresh: refreshGames } = useGames();
  const { refresh: refreshScores } = useScores();
  const { user, signOut, retrySync } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const textColor = useThemeColor({}, "text");
  const placeholderTextColor = useThemeColor({ light: "#9CA3AF", dark: "#6B7280" }, "icon");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await getUserProfile();
    setUserProfile(profile);
    setProfileLoading(false);
    setNameDraft(profile?.name || "");
  };

  const handleExportData = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await dataTransfer.exportAndShare();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setFeedback({ tone: "error", message: "Couldn't export your data. Please try again." });
    }
  };

  const handleImportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowImportModal(true);
  };

  const runImport = async (mode: "replace" | "merge") => {
    setImporting(true);
    try {
      await dataTransfer.pickAndImportData(mode);
      await refreshGames();
      await refreshScores();
      await loadUserProfile();
      // Push imported records to the cloud straight away; merge sync would
      // otherwise only pick them up on the next app start.
      retrySync().catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowImportModal(false);
      setFeedback({
        tone: "success",
        message: mode === "replace" ? "Data imported." : "Data merged.",
      });
    } catch (error) {
      setShowImportModal(false);
      setFeedback({
        tone: "error",
        message: "Couldn't import that file. Please check it's a valid backup.",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleEditName = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameDraft(userProfile?.name || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setFeedback({ tone: "error", message: "Please enter a name to save." });
      return;
    }

    await updateUserProfile({ name: trimmedName });
    await loadUserProfile();
    // Best-effort push — profile download is cloud-wins, so a rename that
    // never reaches the cloud would be reverted on the next sync.
    const updated = await getUserProfile();
    if (updated) {
      syncUserProfile(updated).catch((err) =>
        console.log("[Settings] Profile push failed:", err)
      );
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditingName(false);
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
      <FeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
        top={Math.max(insets.top, 20) + 8}
      />

      {/* Import Data Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText type="subtitle">Import Data</ThemedText>
            <ThemedText style={styles.infoText}>
              Replace all wipes your current games and scores and loads the file.
              Merge keeps what you have and adds anything new from the file.
            </ThemedText>
            {importing ? (
              <ActivityIndicator color={tintColor} style={styles.importSpinner} />
            ) : (
              <View style={styles.importActions}>
                <Pressable
                  onPress={() => runImport("merge")}
                  style={[styles.modalButton, { borderColor }]}
                >
                  <ThemedText>Merge</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => runImport("replace")}
                  style={[styles.modalButtonPrimary, { backgroundColor: "#FF3B30" }]}
                >
                  <ThemedText style={styles.modalButtonPrimaryText}>Replace all</ThemedText>
                </Pressable>
              </View>
            )}
            {!importing && (
              <Pressable
                onPress={() => setShowImportModal(false)}
                style={styles.importCancel}
              >
                <ThemedText style={{ color: tintColor }}>Cancel</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Name Editing Modal */}
      <Modal
        visible={isEditingName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText type="subtitle">Edit Your Name</ThemedText>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your name"
              placeholderTextColor={placeholderTextColor}
              style={[styles.modalInput, { color: textColor, borderColor }]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setIsEditingName(false)}
                style={[styles.modalButton, { borderColor }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                style={[styles.modalButtonPrimary, { backgroundColor: tintColor }]}
              >
                <ThemedText style={styles.modalButtonPrimaryText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText type="subtitle">Sign Out</ThemedText>
            <ThemedText style={styles.infoText}>
              Are you sure you want to sign out? Your data is safely synced to the cloud.
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSignOutConfirm(false);
                }}
                style={[styles.modalButton, { borderColor }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowSignOutConfirm(false);
                  try {
                    console.log("[Settings] Sign out confirmed, calling signOut()");
                    await signOut();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch (error: any) {
                    console.error("[Settings] Sign out error:", error);
                    setFeedback({
                      tone: "error",
                      message: "Couldn't sign out. Please try again.",
                    });
                  }
                }}
                style={[styles.modalButtonPrimary, { backgroundColor: "#FF3B30" }]}
              >
                <ThemedText style={styles.modalButtonPrimaryText}>Sign Out</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Appearance
          </ThemedText>
          <View style={[styles.settingRow, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.segmentRow}>
              {THEME_OPTIONS.map(({ value, label }) => {
                const selected = preference === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPreference(value);
                    }}
                    style={[
                      styles.segment,
                      { borderColor },
                      selected && { backgroundColor: tintColor, borderColor: tintColor },
                    ]}
                  >
                    <ThemedText style={selected ? styles.segmentLabelSelected : undefined}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <ThemedText style={styles.settingDescription}>
            System follows your device&apos;s light/dark setting.
          </ThemedText>
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
              console.log("[Settings] Sign out button pressed");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowSignOutConfirm(true);
            }}
            style={({ pressed }) => [
              styles.settingRow,
              {
                backgroundColor: cardBackground,
                borderColor,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View style={styles.settingRowLeft}>
              <ThemedText type="defaultSemiBold" style={{ color: "#FF3B30" }}>
                Sign Out
              </ThemedText>
            </View>
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
            <ThemedText style={styles.settingRowRight}>{Constants.expoConfig?.version || "1.0.0"}</ThemedText>
          </View>
          <View style={[styles.infoCard, { backgroundColor: cardBackground }]}>
            <ThemedText style={styles.infoText}>
              Daily Games Hub helps you track all your favorite daily games in one place.
              Build streaks, track your stats, and compete with friends!
            </ThemedText>
          </View>
        </View>

        {/* Update log */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            What&apos;s New
          </ThemedText>
          <View style={[styles.infoCard, { backgroundColor: cardBackground }]}>
            {CHANGELOG.map((release, i) => (
              <View
                key={release.version}
                style={i === CHANGELOG.length - 1 ? undefined : styles.releaseBlock}
              >
                <ThemedText type="defaultSemiBold" style={styles.releaseHeading}>
                  v{release.version} ·{" "}
                  {new Date(release.date).toLocaleDateString("en-GB")}
                </ThemedText>
                {release.entries.map((entry) => (
                  <ThemedText key={entry} style={[styles.infoText, styles.releaseEntry]}>
                    {"•"} {entry}
                  </ThemedText>
                ))}
              </View>
            ))}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  importActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  importSpinner: {
    paddingVertical: 12,
  },
  importCancel: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalButtonPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalButtonPrimaryText: {
    color: "#fff",
    fontWeight: "600",
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
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentLabelSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  releaseBlock: {
    marginBottom: 16,
  },
  releaseHeading: {
    marginBottom: 4,
  },
  releaseEntry: {
    marginBottom: 2,
  },
});
