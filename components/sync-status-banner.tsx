import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { ThemedText } from "./themed-text";
import { IconSymbol } from "./ui/icon-symbol";
import { useAuth } from "@/contexts/auth-context";
import { useThemeColor } from "@/hooks/use-theme-color";

export function SyncStatusBanner() {
  const { syncStatus, syncError, syncing, retrySync } = useAuth();
  const errorColor = useThemeColor({ light: "#EF4444", dark: "#FCA5A5" }, "text");
  const errorBgColor = useThemeColor({ light: "#FEE2E2", dark: "#7F1D1D" }, "background");
  const syncingBgColor = useThemeColor({ light: "#DBEAFE", dark: "#1E3A8A" }, "background");
  const syncingColor = useThemeColor({ light: "#2563EB", dark: "#93C5FD" }, "text");

  // Don't show banner if idle or success
  if (syncStatus === "idle" || syncStatus === "success") {
    return null;
  }

  // Show syncing status
  if (syncing || syncStatus === "syncing") {
    return (
      <View style={[styles.banner, { backgroundColor: syncingBgColor }]}>
        <ActivityIndicator size="small" color={syncingColor} />
        <ThemedText style={[styles.text, { color: syncingColor }]}>
          Syncing data...
        </ThemedText>
      </View>
    );
  }

  // Show error status
  if (syncStatus === "error" && syncError) {
    return (
      <View style={[styles.banner, { backgroundColor: errorBgColor }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={20} color={errorColor} />
        <View style={styles.errorContent}>
          <ThemedText style={[styles.errorText, { color: errorColor }]}>
            Sync failed: {syncError.message}
          </ThemedText>
          {syncError.retryable && (
            <Pressable onPress={retrySync} style={styles.retryButton}>
              <ThemedText style={[styles.retryText, { color: syncingColor }]}>
                Retry
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
  errorContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
