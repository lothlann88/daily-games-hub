import { supabase } from "./supabase";
import type {
  Friend,
  FriendRequest,
  FriendRequestWithProfile,
  SearchResult,
  FriendScore,
  FriendLeaderboardEntry,
} from "@/types/friends";

// ============================================================================
// FRIEND REQUEST FUNCTIONS
// ============================================================================

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(receiverId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if already friends
  const areFriends = await checkAreFriends(receiverId);
  if (areFriends) {
    throw new Error("Already friends with this user");
  }

  // Check if request already exists
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("*")
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .single();

  if (existing) {
    throw new Error("Friend request already exists");
  }

  const { error } = await supabase.from("friend_requests").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    status: "pending",
  });

  if (error) throw error;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_friend_request", {
    request_id: requestId,
  });

  if (error) throw error;
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) throw error;
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);

  if (error) throw error;
}

/**
 * Get incoming friend requests (requests sent to current user)
 */
export async function getIncomingFriendRequests(): Promise<FriendRequestWithProfile[]> {
  console.log("[getIncomingFriendRequests] Starting...");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[getIncomingFriendRequests] User:", { hasUser: !!user, userId: user?.id });
  if (!user) return [];

  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      `
      *,
      sender_profile:user_profiles!friend_requests_sender_id_fkey(id, name, username, avatar_url)
    `
    )
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((req) => ({
    ...req,
    sender_profile: Array.isArray(req.sender_profile) ? req.sender_profile[0] : req.sender_profile,
  }));
}

/**
 * Get outgoing friend requests (requests sent by current user)
 */
export async function getOutgoingFriendRequests(): Promise<FriendRequestWithProfile[]> {
  console.log("[getOutgoingFriendRequests] Starting...");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[getOutgoingFriendRequests] User:", { hasUser: !!user, userId: user?.id });
  if (!user) return [];

  const { data, error } = await supabase
    .from("friend_requests")
    .select(
      `
      *,
      receiver_profile:user_profiles!friend_requests_receiver_id_fkey(id, name, username, avatar_url)
    `
    )
    .eq("sender_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((req) => ({
    ...req,
    receiver_profile: Array.isArray(req.receiver_profile)
      ? req.receiver_profile[0]
      : req.receiver_profile,
  }));
}

// ============================================================================
// FRIEND MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get list of friends
 */
export async function getFriends(): Promise<Friend[]> {
  console.log("[getFriends] Starting...");
  
  try {
    console.log("[getFriends] Calling supabase.auth.getUser()...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    console.log("[getFriends] User:", { hasUser: !!user, userId: user?.id });
    if (!user) {
      console.log("[getFriends] No user, returning empty array");
      return [];
    }

    console.log("[getFriends] Querying friendships table...");
    const { data, error } = await supabase
      .from("friendships")
      .select(
        `
        id,
        created_at,
        friend:user_profiles!friendships_friend_id_fkey(id, name, username, avatar_url, is_private)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    console.log("[getFriends] Query result:", { hasData: !!data, hasError: !!error, dataLength: data?.length });
    
    if (error) {
      console.error("[getFriends] Query error:", error);
      throw error;
    }

    const friends = (data || []).map((friendship) => {
      const friendProfile = Array.isArray(friendship.friend)
        ? friendship.friend[0]
        : friendship.friend;
      return {
        id: friendProfile.id,
        name: friendProfile.name,
        username: friendProfile.username,
        avatar_url: friendProfile.avatar_url,
        is_private: friendProfile.is_private,
        friendship_created_at: friendship.created_at,
      };
    });
    
    console.log("[getFriends] Returning", friends.length, "friends");
    return friends;
  } catch (error) {
    console.error("[getFriends] Caught error:", error);
    throw error;
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(friendId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_friendship", {
    friend_user_id: friendId,
  });

  if (error) throw error;
}

/**
 * Search for users by email or name
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  if (!query || query.trim().length < 2) return [];

  // Search by name or username
  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, name, username, avatar_url, is_private")
    .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
    .neq("id", user.id)
    .limit(20);

  if (error) throw error;
  if (!profiles) return [];

  // Check friendship and request status for each result
  const results = await Promise.all(
    profiles.map(async (profile) => {
      const isFriend = await checkAreFriends(profile.id);
      const requestStatus = await checkPendingRequest(profile.id);

      return {
        ...profile,
        is_friend: isFriend,
        has_pending_request: requestStatus.has_request,
        request_direction: requestStatus.direction,
      };
    })
  );

  return results;
}

/**
 * Check if users are friends
 */
export async function checkAreFriends(friendId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_id", user.id)
    .eq("friend_id", friendId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return !!data;
}

/**
 * Check if friend request exists
 */
export async function checkPendingRequest(
  userId: string
): Promise<{ has_request: boolean; direction?: "sent" | "received" }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { has_request: false };

  // Check if current user sent request
  const { data: sentRequest } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", userId)
    .eq("status", "pending")
    .single();

  if (sentRequest) {
    return { has_request: true, direction: "sent" };
  }

  // Check if current user received request
  const { data: receivedRequest } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("sender_id", userId)
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .single();

  if (receivedRequest) {
    return { has_request: true, direction: "received" };
  }

  return { has_request: false };
}

// ============================================================================
// SCORE COMPARISON FUNCTIONS
// ============================================================================

/**
 * Get friend scores for a specific game
 */
export async function getFriendScoresForGame(gameId: string): Promise<FriendScore[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all friends
  const friends = await getFriends();
  if (friends.length === 0) return [];

  const friendIds = friends.map((f) => f.id);

  // Get scores from friends for this game
  const { data: scores, error } = await supabase
    .from("scores")
    .select("user_id, score, played_at")
    .eq("game_id", gameId)
    .in("user_id", friendIds)
    .order("score", { ascending: false })
    .order("played_at", { ascending: false });

  if (error) throw error;
  if (!scores) return [];

  // Get best score for each friend
  const friendScores: FriendScore[] = [];
  const seenFriends = new Set<string>();

  for (const score of scores) {
    if (!seenFriends.has(score.user_id)) {
      seenFriends.add(score.user_id);
      const friend = friends.find((f) => f.id === score.user_id);
      if (friend) {
        friendScores.push({
          friend_id: friend.id,
          friend_name: friend.name,
          friend_avatar: friend.avatar_url,
          score: score.score,
          played_at: score.played_at,
        });
      }
    }
  }

  // Add rank
  return friendScores.map((fs, index) => ({
    ...fs,
    rank: index + 1,
  }));
}

/**
 * Get friend leaderboard for a game (including current user)
 */
export async function getFriendLeaderboard(gameId: string): Promise<FriendLeaderboardEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get all friends
  const friends = await getFriends();
  const allUserIds = [user.id, ...friends.map((f) => f.id)];

  // Get all scores for this game from friends and current user
  const { data: scores, error } = await supabase
    .from("scores")
    .select("user_id, score, played_at")
    .eq("game_id", gameId)
    .in("user_id", allUserIds)
    .order("score", { ascending: false });

  if (error) throw error;
  if (!scores) return [];

  // Calculate stats for each user
  const userStats = new Map<
    string,
    { best_score: number; total_plays: number; current_streak: number }
  >();

  for (const score of scores) {
    const existing = userStats.get(score.user_id);
    if (!existing) {
      userStats.set(score.user_id, {
        best_score: score.score,
        total_plays: 1,
        current_streak: 0, // TODO: Calculate streak
      });
    } else {
      existing.total_plays++;
      if (score.score > existing.best_score) {
        existing.best_score = score.score;
      }
    }
  }

  // Build leaderboard entries
  const entries: FriendLeaderboardEntry[] = [];

  for (const [userId, stats] of userStats.entries()) {
    const isCurrentUser = userId === user.id;
    let name = "You";
    let avatar_url: string | undefined;

    if (!isCurrentUser) {
      const friend = friends.find((f) => f.id === userId);
      if (friend) {
        name = friend.name;
        avatar_url = friend.avatar_url;
      }
    } else {
      // Get current user profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, avatar_url")
        .eq("id", userId)
        .single();
      if (profile) {
        avatar_url = profile.avatar_url;
      }
    }

    entries.push({
      user_id: userId,
      name,
      avatar_url,
      best_score: stats.best_score,
      total_plays: stats.total_plays,
      current_streak: stats.current_streak,
      rank: 0, // Will be set below
      is_current_user: isCurrentUser,
    });
  }

  // Sort by best score and assign ranks
  entries.sort((a, b) => b.best_score - a.best_score);
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
