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
