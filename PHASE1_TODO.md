# Phase 1: Single User Implementation TODO

## Data Model Changes
- [ ] Remove Player type from types/index.ts
- [ ] Remove playerId from Score type
- [ ] Add UserProfile type
- [ ] Remove player-related functions from storage.ts
- [ ] Add user profile storage functions
- [ ] Remove usePlayer hook
- [ ] Add useUserProfile hook

## Score Logging Updates
- [ ] Remove player selection dropdown from game-detail.tsx
- [ ] Update addScore to not require playerId
- [ ] Update score display to show "Your Scores"
- [ ] Remove player name from score cards
- [ ] Update recent scores section

## Onboarding Flow
- [ ] Create app/onboarding.tsx screen
- [ ] Add welcome screen
- [ ] Add name input screen
- [ ] Add optional avatar selection
- [ ] Store user profile on completion
- [ ] Add onboarding check in _layout.tsx
- [ ] Redirect to onboarding on first launch

## Stats Screen (Replace Leaderboard)
- [ ] Rename leaderboard.tsx to stats.tsx
- [ ] Remove player comparison logic
- [ ] Add personal stats summary
- [ ] Add total games played
- [ ] Add total active streaks
- [ ] Add best performing games section
- [ ] Add activity calendar/heatmap
- [ ] Add personal achievements section

## Profile Screen (Replace Settings)
- [ ] Rename settings.tsx to profile.tsx
- [ ] Add profile header with avatar
- [ ] Add editable name field
- [ ] Add quick stats cards
- [ ] Move settings sections below profile
- [ ] Keep notifications, reminders, data management
- [ ] Add about section

## Navigation Updates
- [ ] Update tab layout with new icons
- [ ] Change "Leaderboard" to "Stats"
- [ ] Change "Settings" to "Profile"
- [ ] Update icon mappings in icon-symbol.tsx

## Personalization
- [ ] Add welcome message with user name to home screen
- [ ] Change "Daily Games" to "Your Games"
- [ ] Update all text to use "Your" language
- [ ] Add "You've played X games today" message
- [ ] Update game detail to show "Your Play History"
- [ ] Update streak display to "Your Streak"

## New Components
- [ ] Create components/user-avatar.tsx
- [ ] Create components/stats-card.tsx
- [ ] Create components/activity-heatmap.tsx (optional)

## Testing
- [ ] Test first launch onboarding
- [ ] Test profile creation
- [ ] Test score logging without player selection
- [ ] Test stats screen displays correctly
- [ ] Test profile editing
- [ ] Test data export/import
- [ ] Test all navigation flows

## Final Polish
- [ ] Review all screens for "Your" language
- [ ] Ensure consistent styling
- [ ] Test on iOS device
- [ ] Create checkpoint
- [ ] Push to GitHub
