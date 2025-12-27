import { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as friendsLib from "@/lib/friends";
import type { SearchResult } from "@/types/friends";

export default function AddFriendScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
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

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const results = await friendsLib.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      Alert.alert("Error", "Failed to search users");
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

      Alert.alert("Success", "Friend request sent!");
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", error.message || "Failed to send friend request");
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
        Alert.alert("Info", "Please go to Friends tab to accept this request");
      } else if (!item.is_friend && !item.has_pending_request) {
        await handleSendRequest(item.id);
      }
    };

    return (
      <View style={[styles.resultCard, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.resultLeft}>
          <View style={[styles.avatar, { backgroundColor: tintColor }]}>
            <ThemedText style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
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
            placeholder="Search by name or username..."
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
          Search for friends by their name or username
        </ThemedText>
      </View>

      {/* Search Results */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        renderItem={renderSearchResult}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          searchQuery.trim().length >= 2 && !searching ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No users found</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Try searching with a different name or username
              </ThemedText>
            </View>
          ) : searchQuery.trim().length < 2 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>Start typing to search</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Enter at least 2 characters to find friends
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
