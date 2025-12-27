# Phase 3: Friends System - Implementation Plan

## Overview

Phase 3 adds social features to Daily Games Hub, allowing users to connect with friends, send friend requests, view friend lists, and compare scores. This creates a competitive and social experience that increases engagement.

## Goals

1. **Friend Management**: Add, remove, and manage friends
2. **Friend Requests**: Send, accept, and reject friend requests
3. **Friend Discovery**: Search for users by email or username
4. **Score Comparison**: Compare your scores with friends on each game
5. **Friend Leaderboards**: See how you rank among friends for each game

## Database Schema

### New Tables

#### `friendships` table
Stores confirmed friendships between users (bidirectional).

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);
```

**Indexes:**
- `idx_friendships_user_id` on `user_id`
- `idx_friendships_friend_id` on `friend_id`

**RLS Policies:**
- Users can view their own friendships
- Users can delete their own friendships

#### `friend_requests` table
Stores pending friend requests.

```sql
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);
```

**Indexes:**
- `idx_friend_requests_sender_id` on `sender_id`
- `idx_friend_requests_receiver_id` on `receiver_id`
- `idx_friend_requests_status` on `status`

**RLS Policies:**
- Users can view requests they sent or received
- Users can create requests as sender
- Users can update requests they received (accept/reject)
- Users can delete requests they sent (cancel)

### Schema Updates

Update `user_profiles` table to make profiles searchable:
- Make `name` searchable
- Add optional `username` field (unique)
- Add `is_private` flag (already exists)

## API Functions (lib/friends.ts)

### Friend Request Functions

```typescript
// Send a friend request
sendFriendRequest(receiverId: string): Promise<void>

// Accept a friend request
acceptFriendRequest(requestId: string): Promise<void>

// Reject a friend request
rejectFriendRequest(requestId: string): Promise<void>

// Cancel a sent friend request
cancelFriendRequest(requestId: string): Promise<void>

// Get incoming friend requests
getIncomingFriendRequests(): Promise<FriendRequest[]>

// Get outgoing friend requests
getOutgoingFriendRequests(): Promise<FriendRequest[]>
```

### Friend Management Functions

```typescript
// Get list of friends
getFriends(): Promise<Friend[]>

// Remove a friend
removeFriend(friendId: string): Promise<void>

// Search for users by email or name
searchUsers(query: string): Promise<UserProfile[]>

// Check if users are friends
areFriends(userId: string, friendId: string): Promise<boolean>

// Check if friend request exists
hasPendingRequest(userId: string, friendId: string): Promise<boolean>
```

### Score Comparison Functions

```typescript
// Get friend scores for a specific game
getFriendScoresForGame(gameId: string): Promise<FriendScore[]>

// Get friend leaderboard for a game
getFriendLeaderboard(gameId: string): Promise<LeaderboardEntry[]>

// Get friend stats comparison
compareFriendStats(friendId: string): Promise<StatsComparison>
```

## UI Components

### 1. Friends Tab (New Tab)

**Location**: `app/(tabs)/friends.tsx`

**Sections:**
- **Friend List**: Display all confirmed friends with avatars and stats
- **Pending Requests**: Show incoming requests (accept/reject buttons)
- **Sent Requests**: Show outgoing requests (cancel button)
- **Add Friend Button**: Floating action button to search and add friends

**Features:**
- Pull to refresh
- Empty states for no friends/requests
- Friend count badge
- Tap friend to view their profile/stats

### 2. Add Friend Modal

**Location**: `app/add-friend.tsx`

**Features:**
- Search input (email or name)
- Search results list
- "Add Friend" button for each result
- Shows existing friend status
- Shows pending request status

### 3. Friend Profile Screen

**Location**: `app/friend-profile.tsx`

**Sections:**
- Friend info (name, avatar, member since)
- Overall stats (total games, total scores)
- Shared games list
- Score comparison for each shared game
- "Remove Friend" button

### 4. Friend Leaderboard Component

**Location**: `components/friend-leaderboard.tsx`

**Features:**
- Ranked list of friends for a specific game
- Shows position, name, best score, streak
- Highlights current user
- Shows "You" indicator
- Podium design for top 3

## User Flows

### Flow 1: Add a Friend

1. User taps "Add Friend" button on Friends tab
2. Modal opens with search input
3. User types friend's email or name
4. Search results appear
5. User taps "Add Friend" next to desired person
6. Friend request sent
7. Request appears in "Sent Requests" section
8. Friend receives notification (future: push notification)
9. Friend accepts request
10. Both users see each other in friend list

### Flow 2: Accept Friend Request

1. User opens Friends tab
2. Sees badge with pending request count
3. Taps on "Pending Requests" section
4. Views incoming requests
5. Taps "Accept" on a request
6. Request moves to friend list
7. Friendship created (bidirectional)

### Flow 3: Compare Scores with Friend

1. User opens game detail screen
2. Sees "Friend Leaderboard" section
3. Views ranked list of friends who play this game
4. Sees own position highlighted
5. Taps on a friend to view detailed comparison
6. Sees side-by-side stats and score history

## Privacy Considerations

- **Private Profiles**: Users can set `is_private = true` to hide from search
- **Friend-Only Data**: Scores only visible to friends
- **Block Feature** (Future): Allow users to block others

## RLS Security

All friend-related queries enforce Row Level Security:

1. **friendships table**:
   - Users can only see friendships where they are `user_id` or `friend_id`
   - Users can only delete their own friendships

2. **friend_requests table**:
   - Users can only see requests where they are sender or receiver
   - Users can only create requests as sender
   - Users can only update requests they received
   - Users can only delete requests they sent

3. **user_profiles table**:
   - Public profiles visible in search
   - Private profiles only visible to friends

## Implementation Steps

### Step 1: Database Setup
1. Create SQL migration file
2. Run migration in Supabase
3. Verify tables and RLS policies

### Step 2: API Layer
1. Create `lib/friends.ts` with all friend functions
2. Create `types/friends.ts` for TypeScript types
3. Test API functions

### Step 3: UI Components
1. Add Friends tab to navigation
2. Create friend list component
3. Create friend request components
4. Create add friend modal
5. Create friend leaderboard component

### Step 4: Integration
1. Add friend tab icon mapping
2. Update tab navigation
3. Integrate friend functions into UI
4. Add friend leaderboards to game detail screen
5. Add friend indicators throughout app

### Step 5: Testing
1. Test friend request flow
2. Test friend removal
3. Test score comparison
4. Test privacy settings
5. Test edge cases (duplicate requests, self-requests, etc.)

## Future Enhancements (Post-Phase 3)

- **Push Notifications**: Notify users of friend requests
- **Friend Activity Feed**: See when friends play games
- **Friend Challenges**: Challenge friends to beat your score
- **Group Leaderboards**: Create custom groups of friends
- **Friend Suggestions**: Suggest mutual friends
- **Block/Report**: Safety features
- **Friend Streaks**: Track consecutive days playing with friends

## Success Metrics

- Number of friend connections created
- Friend request acceptance rate
- Engagement increase after adding friends
- Score comparison feature usage
- Friend leaderboard views per game

## Technical Notes

- Friendships are bidirectional (both users see each other)
- Friend requests are unidirectional (sender → receiver)
- Accepting a request creates two friendship rows (one for each direction)
- Removing a friend deletes both friendship rows
- Friend data syncs automatically with existing sync system
- Friend leaderboards update in real-time when scores change

This plan provides a complete social layer that encourages competition, engagement, and retention.
