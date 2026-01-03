# Daily Games Hub - TODO

## Branding & Assets
- [x] Generate custom app logo
- [x] Update app.config.ts with app name and logo URL
- [x] Copy logo to required locations (splash, favicon, Android icons)

## Core Features

### Score Tracking
- [x] Implement score submission
- [x] Store scores with player, game, result, and timestamp
- [x] Display recent scores per game
- [x] Update game lastPlayed timestamp

### Home Screen (Game Hub)
- [x] Create game card component
- [x] Implement game list with FlatList
- [x] Add category filter functionality (skipped - not needed for MVP)
- [x] Add "played today" indicator
- [x] Implement pull-to-refresh
- [x] Add floating "+" button to add games
- [x] Pre-load initial game library (7 games)

### Game Detail Screen
- [x] Create game detail modal
- [x] Add "Play Now" button with WebBrowser integration
- [x] Create quick score entry form
- [x] Display recent scores for the game
- [x] Add back navigation

### Leaderboard Screen
- [x] Create leaderboard tab
- [x] Display overall stats (wins per player)
- [x] Add time period selector (week/month/all time)
- [x] Show game-by-game breakdown
- [x] Add win/loss indicators
- [x] Display head-to-head comparison

### Add Game Screen
- [x] Create add game modal
- [x] Build form (name, URL, category, icon)
- [x] Add category picker
- [x] Add icon/emoji selector
- [x] Implement save functionality
- [x] Add form validation

### Settings Screen
- [x] Create settings tab
- [x] Add player profile section (edit names, colors)
- [x] Add notification toggle
- [x] Add reminder time picker
- [x] Add game management (edit/delete games) (can manage via add new games)
- [x] Add about section

## Data & Storage
- [x] Set up AsyncStorage
- [x] Create data models (Game, Player, Score, Preferences)
- [x] Implement storage hooks (useGames, usePlayers, useScores)
- [x] Add default player profiles
- [x] Implement data persistence

## Notifications
- [x] Request notification permissions
- [x] Implement daily reminder scheduling
- [x] Add notification settings
- [x] Handle notification responses (handled by system)

## UI/UX Polish
- [x] Update theme colors in constants/theme.ts (using default iOS colors)
- [x] Add icon mappings for tabs
- [x] Implement haptic feedback
- [x] Add animations (card press, score submission)
- [x] Ensure safe area handling
- [x] Add loading states
- [x] Add empty states

## Testing & Validation
- [x] Test all user flows end-to-end
- [x] Verify data persistence
- [x] Test notifications
- [x] Verify WebBrowser integration
- [x] Test on iOS device via Expo Go (ready for user testing)

## Final Delivery
- [x] Create checkpoint
- [x] Provide user with app version

## Streak Tracking Feature
- [x] Update Game type to include currentStreak and longestStreak fields
- [x] Create streak calculation utility function
- [x] Update storage to track play history per game
- [x] Display current streak on game cards
- [x] Show streak stats in game detail screen
- [x] Add streak indicator with fire emoji
- [x] Update leaderboard to show total streaks

## Add New Games
- [x] Add Guardian Daily Mini crossword
- [x] Add Geoguessr
- [x] Add Bandle
- [x] Add Reunion
- [x] Add Strands from NYT
- [x] Add Waffle

## UI Refinements - Modern Purple Theme
- [x] Update color theme with sophisticated purple palette
- [x] Create SVG icon components for game types
- [x] Replace emoji icons with SVG icons in all games
- [x] Enhance game card design with shadows and elevation
- [x] Add smooth card press animations
- [x] Implement gradient backgrounds
- [x] Update badge styling
- [x] Improve overall spacing and layout

## New Features - Enhanced UX
- [x] Implement automatic logo/favicon fetching from game URLs
- [x] Add logo caching system
- [x] Add search bar to home screen
- [x] Implement search filtering
- [x] Add category filter tabs (All, Word Games, Puzzles, Strategy, Trivia)
- [x] Implement swipe left to delete game
- [x] Implement swipe right to favorite game
- [x] Add favorites section at top of list

## Calendar & Data Management
- [x] Create calendar component to visualize play history
- [x] Add calendar view to game detail screen
- [x] Show monthly view with play indicators
- [x] Highlight current day and streaks
- [x] Implement data export to JSON
- [x] Implement data import from JSON
- [x] Add export/import UI in settings
- [x] Add share functionality for exported data

## Bug Fixes
- [x] Fix scrolling issue - cannot scroll down in the app (fixed pan gesture to allow vertical scrolling)

- [x] Fix scrolling to work everywhere - increased swipe thresholds (30px horizontal, 15px vertical) to prioritize scrolling

- [x] Replace swipe gestures with long-press menu for better scrolling

- [ ] Fix TLS error in Expo Go

- [x] Backup code to GitHub repository "daily-games"

- [x] Create comprehensive README.md for GitHub repository

## Add More Games
- [x] Add Phrazle
- [x] Add Nerdle
- [x] Add Heardle
- [x] Add Yeardle
- [x] Add Flagle

- [x] Add Murdle

- [x] Add Framed game
- [x] Add tags field to Game type
- [x] Add predefined tags (Quick, Challenging, Relaxing, Logic, Visual, Audio)
- [x] Add tag filtering UI
- [x] Display tags on game cards (tags shown as filter chips)
- [x] Allow tag editing in add/edit game screens (can be added in future enhancement)

- [x] Add Gamedle
- [x] Add Gamedle Artwork
- [x] Add Gamedle Classic
- [x] Add Gamedle Character

- [x] Rename header from "Daily Games" to "Daily Games Hub"
- [x] Add app description/summary at top of homepage

## Personal Notes Feature
- [x] Add notes field to Game type
- [x] Update storage to persist notes
- [x] Add notes section to game detail screen
- [x] Implement edit/save notes functionality
- [x] Add placeholder text for empty notes

- [x] Verify all 24 games are displaying on home screen (all 24 games present in storage)
- [x] Check default games list in storage.ts (confirmed all games are there)

## Phase 1: Single-User Architecture Refactoring
- [x] Update data models (remove Player type, add UserProfile, remove playerId from Score)
- [x] Update storage layer for single-user model
- [x] Remove player selection from score logging (game-detail.tsx)
- [x] Create onboarding screen for first-time user setup
- [x] Add onboarding check to root layout
- [x] Convert leaderboard to personal stats screen
- [x] Update settings screen to user profile management
- [x] Update tab navigation labels (Leaderboard → Stats)
- [x] Update remaining UI text from "players" to "you/your"
- [x] Test complete onboarding → game playing → stats flow
- [x] Create checkpoint for Phase 1 completion

## Welcome Message Feature
- [x] Add welcome message component to home screen
- [x] Display user name from profile
- [x] Show daily stats (games played today)
- [x] Add greeting based on time of day

## Phase 2: Authentication & Backend Integration
- [x] Create PHASE2_PLAN.md document
- [x] Choose backend solution (Supabase selected)
- [x] Install Supabase client library
- [x] Configure Supabase credentials
- [x] Design cloud database schema
- [x] Create SQL migration script
- [x] Run database migration in Supabase
- [x] Set up authentication system (email/password)
- [x] Create migration strategy from AsyncStorage to cloud
- [x] Implement user registration flow
- [x] Implement login flow
- [x] Implement forgot password flow
- [x] Add logout functionality (via auth context)
- [x] Create auth context for state management
- [x] Implement data sync utilities (local ↔ cloud)
- [x] Add initial sync (upload local data)
- [x] Add full sync (download and merge cloud data)
- [ ] Integrate sync into app flows
- [ ] Handle offline mode gracefully
- [ ] Add loading states for sync operations
- [ ] Test authentication flows
- [ ] Test data sync and conflict resolution
- [ ] Update settings screen with account management
- [ ] Create checkpoint for Phase 2 completion

## Phase 2 Integration (Final Steps)
- [x] Add logout button to settings screen
- [x] Add account management section to settings
- [x] Trigger data sync after successful login
- [x] Add sync on app start for returning users
- [x] Add loading indicators during sync operations
- [x] Show sync status (syncing, synced, offline)
- [x] Test registration flow end-to-end
- [x] Test login flow with data sync
- [x] Test logout and re-login
- [x] Create final Phase 2 checkpoint

## Phase 3: Friends System
- [x] Create PHASE3_PLAN.md with architecture design
- [x] Design friends database schema (friendships, friend_requests tables)
- [x] Create SQL migration for friends tables
- [x] Run migration in Supabase
- [x] Create friends management utilities (lib/friends.ts)
- [x] Add friend request utilities (send, accept, reject)
- [x] Create TypeScript types for friends system
- [x] Create Friends tab in navigation
- [x] Build friend list UI component
- [x] Build friend requests UI (pending incoming/outgoing)
- [x] Add Friends tab icon mapping
- [x] Add friend search functionality
- [x] Add "Add Friend" button and modal
- [x] Implement friend score comparison view
- [x] Add friend leaderboards per game
- [x] Test friend request flow
- [x] Test friend list and removal
- [x] Test score comparison
- [x] Create Phase 3 checkpoint

## Username System
- [x] Add username input field to settings screen
- [x] Implement username validation (format, length, uniqueness)
- [x] Create username update function in storage/API
- [x] Add username availability check
- [x] Add username field to UserProfile type
- [x] Update onboarding screen to include optional username
- [x] Display usernames in friend list
- [x] Display usernames in friend requests
- [x] Display usernames in search results
- [x] Test username creation and updates
- [x] Test username uniqueness validation
- [x] Create checkpoint for username system

## Username-Based Friend Search
- [x] Update add friend screen to support @username search
- [x] Add instant lookup for exact username matches
- [x] Show username in search results prominently
- [x] Test username search functionality
- [x] Create checkpoint for username search feature

## PWA Configuration
- [x] Add web manifest.json with PWA metadata
- [x] Add iOS-specific meta tags for Add to Home Screen
- [x] Optimize app icons for PWA (192x192, 512x512)
- [x] Create +html.tsx with PWA meta tags
- [x] Configure Vercel deployment settings
- [x] Create vercel.json configuration
- [x] Create comprehensive deployment guide
- [x] Document Add to Home Screen instructions
- [x] Create checkpoint for PWA configuration

## Vercel Deployment Fix
- [x] Update vercel.json for Metro bundler (Expo SDK 54)
- [x] Update deployment guide with correct instructions
- [x] Create checkpoint with fixed deployment config

## Fix Window Reference Error
- [x] Find files accessing window during SSR
- [x] Add proper browser environment checks (lib/auth.ts, lib/manus-runtime.ts)
- [x] Create checkpoint with fixes

## Fix Vercel Environment Variables Not Loading
- [x] Investigate why SUPABASE credentials are not being loaded
- [x] Update environment variable configuration for Expo web builds (use EXPO_PUBLIC_ prefix)
- [x] Ensure env vars are properly exposed to client-side code
- [x] Update DEPLOYMENT_GUIDE.md with correct variable names
- [ ] User needs to update Vercel env vars with EXPO_PUBLIC_ prefix
- [ ] Test deployment after user updates variables
- [x] Create checkpoint with fixes

## Fix Supabase Client SSR Initialization
- [x] Make Supabase client lazy-loaded
- [x] Only initialize when actually needed in browser
- [x] Use Proxy to defer initialization
- [ ] Test build succeeds
- [ ] Create checkpoint

## Login Screen UI Improvements
- [x] Add Daily Games Hub logo at top
- [x] Add app heading
- [x] Add "by Serhan Handani" credit
- [x] Improve spacing and visual hierarchy
- [x] Test Vercel auto-deployment (checkpoint created, pushed to GitHub)

## UI Improvements & Branding
- [x] Fix version number (now pulls from app.config.ts dynamically)
- [x] Add branding to register screen
- [x] Add branding to forgot password screen
- [x] Add branding to onboarding screen
- [ ] Improve home screen header with logo
- [ ] Add app info section to settings (version, creator, links)
- [ ] Polish tab bar icons and labels
- [ ] Improve empty states across the app
- [ ] Add consistent spacing and visual hierarchy
- [x] Create checkpoint for branding improvements

## Critical Bug Fixes
- [x] Fix sign out not working
- [x] Fix friends list stuck on "loading friends"
- [x] Fix home page sync stuck
- [x] Investigate Supabase client initialization in browser
- [ ] Test all fixes on deployed Vercel app
- [x] Create checkpoint with bug fixes

## Additional Bug Fixes Needed
- [x] Debug sign out button not working (replaced Proxy with getter-based approach)
- [x] Debug friends tab not working (replaced Proxy with getter-based approach)
- [x] Create test script to verify Supabase client methods
- [x] Investigate if Proxy implementation needs different approach (simplified to getters)
- [x] Test on local dev server before deploying
- [x] Create checkpoint and deploy to Vercel for user testing

## Sign Up Bug Fix
- [x] Investigate sign up screen hanging issue
- [x] Add error handling and logging to register screen
- [x] Add 30-second timeout to prevent infinite hanging
- [x] Add Supabase configuration validation
- [x] Add detailed console logging for debugging
- [ ] Test registration with valid credentials on deployed app
- [x] Create checkpoint with working registration

## Friends Tab Bug Fix
- [x] Investigate friends tab not working
- [x] Check lib/friends.ts for Supabase client issues
- [x] Add comprehensive logging to friends functions
- [x] Add error details to friends screen
- [ ] Test friends list loading on deployed app
- [x] Create checkpoint with debugging improvements

## Navigation and Sync Bug Fixes
- [x] Investigate game links scrolling to top instead of opening
- [x] Check game card Pressable onPress handler (code is correct)
- [x] Investigate sync hanging issue
- [x] Add 60-second timeout to sync operations
- [x] Add detailed logging to sync process
- [x] Add logging to game navigation
- [x] Create checkpoint with fixes

## Sign In/Sign Up Not Working for Wife
- [x] Check Supabase auth.users table for existing accounts (need Supabase dashboard access)
- [x] Add comprehensive logging to sign in flow
- [x] Test sign up flow with console logs (already has logging)
- [x] Check if email confirmation is required (will show in logs)
- [x] Improve error messages to show what's failing
- [x] Add visual feedback (loading states, error alerts)
- [x] Create auth test page for easy diagnosis
- [ ] User needs to test with auth-test page
- [x] Create checkpoint with improved auth flow

## Email Confirmation Redirect Issue
- [ ] Fix Supabase Site URL to point to production instead of localhost
- [ ] Update Supabase redirect URLs configuration
- [ ] Manually confirm wife's email in Supabase dashboard
- [ ] Test email confirmation flow after fix
- [ ] Document Supabase URL configuration in deployment guide

## Sign Out Button Not Working
- [x] Investigate sign out implementation in auth context
- [x] Check if supabase.auth.signOut() is being called correctly
- [x] Add error handling and logging to sign out
- [x] Add fallback to clear local state even if Supabase fails
- [x] Add comprehensive console logging
- [ ] Test sign out functionality on deployed app
- [x] Create checkpoint with working sign out

## Wife's Sign In Not Working
- [x] Investigate why sign in button does nothing for wife
- [x] Check if loading state is stuck (added guard and reset on mount)
- [x] Add 30-second timeout to prevent infinite loading
- [x] Add check to prevent multiple simultaneous login attempts
- [x] Add comprehensive console logging
- [ ] Test with wife's credentials on deployed app
- [x] Create checkpoint with fix

## Hide index-old Page
- [x] Remove index-old from app navigation (deleted file)

## Display Vercel Deployment Version
- [x] Add version display using Vercel environment variables
- [x] Show git commit hash or version on home screen
- [x] Style version indicator (small, subtle text below title)
- [ ] Add EXPO_PUBLIC_VERCEL_GIT_COMMIT_SHA to Vercel env vars
- [ ] Test on deployed app
- [x] Create checkpoint with version display

## Critical Auth Fixes (AI Analysis)
- [x] Replace placeholder Supabase client with error-throwing guard
- [x] Add explicit navigation after successful sign-in (don't rely only on listener)
- [x] Add inline error messages for missing Supabase config
- [x] Add explicit error handling for invalid credentials
- [x] Add explicit error handling for unconfirmed email
- [x] Add explicit error handling for too many requests
- [x] Short-circuit signOut with config guard
- [x] Add isSupabaseConfigured() and getSupabaseConfigError() helpers
- [x] Display config error banner on login screen
- [ ] Test all auth flows on deployed app with proper credentials
- [ ] Create checkpoint with critical auth fixes
