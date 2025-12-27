# Phase 1: Single User Focus

## Overview
Transform the Daily Games Hub from a multi-player shared device app to a single-user personal app. This phase focuses on making the app feel personal and removing the awkward player selection flow.

## Goals
- Remove player selection from all flows
- Create personal user profile
- Make all data belong to "you" (the user)
- Polish the single-user experience
- Prepare foundation for Phase 2 (friends/social)

## Changes

### 1. Data Model Updates

**Remove:**
- `Player` type and related functions
- Player selection in score logging
- Player-based leaderboard comparisons

**Update:**
```typescript
// Before: Score has playerId
Score {
  id: string
  playerId: string  // REMOVE
  gameId: string
  score: number
  result: string
  datePlayed: number
}

// After: Score belongs to current user (no ID needed yet)
Score {
  id: string
  gameId: string
  score: number
  result: string
  datePlayed: number
  notes?: string
}

// Add: User profile (local storage for now)
UserProfile {
  id: string
  name: string
  avatar?: string
  createdAt: number
}
```

### 2. Score Logging Flow

**Current flow:**
1. Open game detail
2. Select player (dropdown)
3. Enter score
4. Submit

**New flow:**
1. Open game detail
2. Enter YOUR score
3. Submit

**Changes needed:**
- Remove player picker from game-detail.tsx
- Remove player parameter from addScore function
- Update score display to show "Your Scores" instead of player names

### 3. Leaderboard → Personal Stats

**Current:**
- Shows head-to-head comparison between 2 players
- Win/loss counts per player
- Player-based filtering

**New:**
- Shows YOUR personal statistics
- Total games played
- Total streaks
- Best performing games
- Activity calendar/heatmap
- Personal achievements

**New screen name:** "Stats" or "My Stats"

### 4. User Profile Screen

**New screen:** Profile tab (replaces Settings partially)

**Sections:**
- **Profile header**
  - Avatar (placeholder or uploaded image)
  - Name (editable)
  - Join date
  - Total games played

- **Quick stats**
  - Active streaks count
  - Games played this week
  - Longest streak ever

- **Settings** (moved from old Settings tab)
  - Notifications
  - Reminder time
  - Theme (light/dark)
  - Data management (export/import)

- **About**
  - App version
  - Credits

### 5. Onboarding Flow

**First launch:**
1. Welcome screen
   - "Welcome to Daily Games Hub"
   - Brief explanation
   - "Get Started" button

2. Create profile
   - "What's your name?"
   - Text input
   - Optional: Choose avatar
   - "Start Playing" button

3. Main app
   - Show quick tutorial overlay (optional)
   - Highlight key features

**Storage:**
- Save user profile to AsyncStorage
- Set `hasCompletedOnboarding` flag
- Check flag on app launch

### 6. Navigation Changes

**Current tabs:**
1. Games (home)
2. Leaderboard
3. Settings

**New tabs:**
1. **Games** - Your game library (unchanged)
2. **Stats** - Your personal statistics (replaces Leaderboard)
3. **Profile** - Your profile and settings (replaces Settings)

**Icon updates:**
- Stats: chart/graph icon
- Profile: person icon

### 7. UI Polish

**Personalization:**
- Use "Your" language everywhere
  - "Your Games" instead of "Daily Games"
  - "Your Streaks" instead of "Active Streaks"
  - "Your Best Score" instead of "Best Score"

**Game detail screen:**
- "Your Play History" section
- "Your Notes" section
- "Your Streak" display

**Home screen:**
- Welcome message with user's name
  - "Welcome back, [Name]!"
  - "You've played X games today"

## Files to Modify

### Data & Types
- `types/index.ts` - Remove Player, update Score
- `lib/storage.ts` - Remove player functions, add user profile
- `hooks/use-storage.ts` - Remove usePlayer hook, add useUserProfile

### Screens
- `app/(tabs)/index.tsx` - Add personalized welcome
- `app/(tabs)/leaderboard.tsx` - Transform to stats screen
- `app/(tabs)/settings.tsx` - Transform to profile screen
- `app/game-detail.tsx` - Remove player selection
- `app/onboarding.tsx` - NEW: Create onboarding flow
- `app/_layout.tsx` - Add onboarding check

### Components
- `components/user-avatar.tsx` - NEW: Avatar component
- `components/stats-card.tsx` - NEW: Stats display cards
- `components/activity-heatmap.tsx` - NEW: Calendar heatmap

## Implementation Order

1. ✅ Update data models (types, storage)
2. ✅ Remove player selection from game detail
3. ✅ Update score display to remove player names
4. ✅ Create user profile storage and hooks
5. ✅ Create onboarding flow
6. ✅ Transform leaderboard to stats screen
7. ✅ Transform settings to profile screen
8. ✅ Update navigation tabs
9. ✅ Add personalized welcome messages
10. ✅ Polish UI with "Your" language
11. ✅ Test all flows
12. ✅ Create checkpoint

## Testing Checklist

- [ ] First launch shows onboarding
- [ ] Can create user profile
- [ ] Profile persists across app restarts
- [ ] Can log scores without selecting player
- [ ] Scores display correctly as "your" scores
- [ ] Stats screen shows personal statistics
- [ ] Profile screen shows user info
- [ ] Can edit profile name
- [ ] Export/import still works
- [ ] All "Your" language appears correctly

## Future (Phase 2 Preview)

Once Phase 1 is complete, we'll add:
- Backend authentication
- Friends system
- Score syncing across devices
- Social features (activity feed, comparisons)

But for now, Phase 1 gives you a polished single-user experience that works entirely offline with local storage.
