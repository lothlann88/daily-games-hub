import { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { FeedbackBanner, type FeedbackState } from "@/components/feedback-banner";
import * as friendsLib from "@/lib/friends";
import { normaliseUsernameQuery } from "@/lib/username";
import type { SearchResult } from "@/types/friends";

export default function AddFriendScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#F9FAFB", dark: "#374151" }, "card");

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // searchUsers handles a leading @ itself; below three characters it can
    // never be a username, so don't bother the server.
    if (!normaliseUsernameQuery(query)) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await friendsLib.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      setFeedback({ tone: "error", message: "Couldn't search just now. Please try again." });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      setSendingRequestTo(userId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await friendsLib.sendFriendRequest(userId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh search results to update button states
      await handleSearch(searchQuery);

      setFeedback({ tone: "success", message: "Friend request sent." });
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      setFeedback({ tone: "error", message: "Couldn't send that request. Please try again." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSendingRequestTo(null);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const getButtonText = () => {
      if (item.is_friend) return "Friends";
      if (item.has_pending_request) {
        return item.request_direction === "sent" ? "Pending" : "Accept";
      }
      return "Add Friend";
    };

    const getButtonDisabled = () => {
      return item.is_friend || (item.has_pending_request && item.request_direction === "sent");
    };

    const handleButtonPress = async () => {
      if (item.has_pending_request && item.request_direction === "received") {
        // TODO: Accept the request
        setFeedback({ tone: "success", message: "Accept this request from the Friends tab." });
      } else if (!item.is_friend && !item.has_pending_request) {
        await handleSendRequest(item.id);
      }
    };

    return (
      <View style={[styles.resultCard, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.resultLeft}>
          <View style={[styles.avatar, { backgroundColor: tintColor }]}>
            <ThemedText style={styles.avatarText}>
              {(item.name ?? "?").charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.resultInfo}>
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            {item.username && (
              <ThemedText style={styles.username}>@{item.username}</ThemedText>
            )}
            {item.is_private && (
              <ThemedText style={styles.privateText}>Private Profile</ThemedText>
            )}
          </View>
        </View>
        <Pressable
          style={[
            styles.actionButton,
            getButtonDisabled() && styles.actionButtonDisabled,
            !getButtonDisabled() && { backgroundColor: tintColor },
          ]}
          onPress={handleButtonPress}
          disabled={getButtonDisabled() || sendingRequestTo === item.id}
        >
          {sendingRequestTo === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText
              style={[
                styles.actionButtonText,
                getButtonDisabled() && { color: tintColor },
              ]}
            >
              {getButtonText()}
            </ThemedText>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
        top={Math.max(insets.top, 20) + 8}
      />
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            backgroundColor,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <IconSymbol name="chevron.left" size={24} color={tintColor} />
        </Pressable>
        <ThemedText type="title" style={styles.headerTitle}>
          Add Friend
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={[styles.searchContainer, { backgroundColor: inputBackground, borderColor }]}>
          <IconSymbol name="magnifyingglass" size={20} color={tintColor} />
          <TextInput
            style={[styles.searchInput, { color: useThemeColor({}, "text") }]}
            placeholder="Enter their exact username"
            placeholderTextColor={useThemeColor({ light: "#9CA3AF", dark: "#6B7280" }, "icon")}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={tintColor} />}
          {searchQuery.length > 0 && !searching && (
            <Pressable onPress={() => handleSearch("")}>
              <IconSymbol name="xmark.circle.fill" size={20} color={tintColor} />
            </Pressable>
          )}
        </View>
        <ThemedText style={styles.searchHint}>
          You need their exact username — accounts are not searchable by name.
        </ThemedText>
      </View>

      {/* Search Results */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderSearchResult}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          normaliseUsernameQuery(searchQuery) && !searching ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No account with that username</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Check the spelling — usernames have to match exactly.
              </ThemedText>
            </View>
          ) : !normaliseUsernameQuery(searchQuery) ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>Find someone by username</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Type their username exactly — at least 3 characters.
              </ThemedText>
            </View>
          ) : null
        }
      />
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  searchHint: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
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
  resultInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  privateText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
