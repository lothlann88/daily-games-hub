# Daily Games Hub - Design Document

## Overview
A mobile app for iOS that aggregates daily games (Wordle, LinkedIn games, crosswords, etc.) in a single hub with multiplayer score tracking for two players.

## Design Philosophy
- **Mobile-first**: Optimized for portrait orientation (9:16) and one-handed usage
- **iOS Native Feel**: Follows Apple Human Interface Guidelines (HIG)
- **Simple & Clean**: Minimal UI focusing on quick access to games
- **Local-first**: All data stored locally using AsyncStorage (no cloud sync required)

## Color Palette
- **Primary Accent**: `#007AFF` (iOS Blue) - for buttons, active states, and highlights
- **Success Green**: `#34C759` - for completed games, wins
- **Warning Orange**: `#FF9500` - for pending games, reminders
- **Text Primary**: `#11181C` (light mode), `#ECEDEE` (dark mode)
- **Text Secondary**: `#687076` (light mode), `#9BA1A6` (dark mode)
- **Background**: `#FFFFFF` (light mode), `#151718` (dark mode)
- **Card Background**: `#F2F2F7` (light mode), `#1C1C1E` (dark mode)

## Typography
- **Title**: 32pt, Bold, line-height 40pt
- **Subtitle**: 20pt, Bold, line-height 28pt
- **Body**: 16pt, Regular, line-height 24pt
- **Caption**: 14pt, Regular, line-height 20pt
- **Small**: 12pt, Regular, line-height 16pt

## Spacing System
- **Base unit**: 8pt
- **Standard increments**: 8, 12, 16, 24, 32, 48pt
- **Touch targets**: Minimum 44pt for all interactive elements

## Screen List

### 1. Home Screen (Game Hub)
**Primary Content:**
- List of daily games displayed as cards
- Each card shows: game icon, name, category tag, "Play" button
- Visual indicator (checkmark badge) if game played today
- Header with app title and settings icon

**Key Functionality:**
- Tap card to open game in browser/webview
- Filter games by category (Word Games, Puzzles, Strategy, etc.)
- Quick access to most frequently played games
- Pull-to-refresh to update game status

**Layout:**
- Scrollable vertical list of game cards
- Cards: 16pt rounded corners, 12pt padding
- 16pt spacing between cards
- Safe area padding at top and bottom

### 2. Game Detail Screen
**Primary Content:**
- Game name and description
- "Play Now" button (opens external link)
- Quick score entry form
- Recent scores for this game (last 7 days)

**Key Functionality:**
- Open game URL in browser
- Log score after playing
- View score history for this specific game

**Layout:**
- Full-screen modal presentation
- Header with back button
- Game info at top
- Score entry form in middle
- History list at bottom

### 3. Leaderboard Screen (Tab)
**Primary Content:**
- Overall stats: wins per player
- Game-by-game breakdown
- Weekly/monthly summaries
- Head-to-head comparison charts

**Key Functionality:**
- Toggle between different time periods (week, month, all time)
- View detailed stats per game
- See win streaks and trends

**Layout:**
- Tab bar navigation item
- Segmented control for time period selection
- Stats cards showing key metrics
- List of games with win/loss indicators

### 4. Add Game Screen (Modal)
**Primary Content:**
- Form to add new game
- Fields: Game name, URL, category, icon selection
- Preview of game card

**Key Functionality:**
- Input game details
- Select category from predefined list
- Choose icon from built-in set or emoji
- Save game to library

**Layout:**
- Modal sheet presentation
- Form fields with 12pt spacing
- Large "Add Game" button at bottom
- Cancel button in header

### 5. Settings Screen (Tab)
**Primary Content:**
- Player profiles (names, colors/avatars)
- Notification settings
- Reminder time picker
- Game management (edit/delete games)
- About section

**Key Functionality:**
- Edit player names
- Toggle notifications on/off
- Set reminder time
- Manage game library
- View app version and info

**Layout:**
- Tab bar navigation item
- Grouped list style (iOS Settings-like)
- Sections: Players, Notifications, Game Library, About

## Key User Flows

### Flow 1: Play a Game and Log Score
1. User opens app → sees Home screen with game list
2. User taps on "Wordle" card → Game Detail screen opens
3. User taps "Play Now" → Browser opens with Wordle website
4. User plays game and returns to app
5. User enters score in quick entry form → submits
6. Score is saved and checkmark badge appears on Home screen card

### Flow 2: View Leaderboard
1. User taps Leaderboard tab → sees overall stats
2. User sees "Player 1: 12 wins, Player 2: 8 wins"
3. User scrolls down to see game-by-game breakdown
4. User taps on specific game → sees detailed history for that game

### Flow 3: Add New Game
1. User taps "+" button in Home screen header
2. Add Game modal sheet slides up
3. User enters game name "NYT Mini Crossword"
4. User enters URL "https://www.nytimes.com/crosswords/game/mini"
5. User selects category "Puzzles"
6. User chooses puzzle piece icon
7. User taps "Add Game" → modal closes
8. New game appears in Home screen list

### Flow 4: Set Daily Reminder
1. User taps Settings tab → sees settings list
2. User taps "Notifications" section
3. User toggles "Daily Reminder" to ON
4. User taps "Reminder Time" → time picker appears
5. User selects "9:00 AM"
6. User taps "Done" → reminder is scheduled
7. App will send notification daily at 9 AM

## Component Patterns

### Game Card Component
- **Size**: Full width minus 32pt horizontal padding, auto height
- **Structure**: Horizontal layout with icon (left), info (center), status (right)
- **States**: Default, Pressed, Played (with checkmark)
- **Touch target**: Entire card is tappable

### Score Entry Form
- **Fields**: Player selector (segmented control), Score input (number), Notes (optional text)
- **Validation**: Require player and score before submission
- **Feedback**: Haptic feedback on successful submission

### Player Badge
- **Visual**: Circular avatar with player initial or icon
- **Colors**: Distinct colors for each player (Blue #007AFF, Orange #FF9500)
- **Size**: 32pt diameter for small, 64pt for large

### Stats Card
- **Layout**: Card with metric name, large number, and trend indicator
- **Animation**: Numbers count up on screen appearance
- **Style**: Rounded corners (12pt), subtle shadow

## Navigation Structure

```
Tab Bar (Bottom)
├── Home (house.fill icon)
│   ├── Game Detail Modal
│   └── Add Game Modal
├── Leaderboard (chart.bar.fill icon)
│   └── Game Stats Detail
└── Settings (gearshape.fill icon)
    ├── Edit Player Modal
    └── Notification Settings
```

## Data Models

### Game
```typescript
{
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  dateAdded: number;
  lastPlayed?: number;
}
```

### Player
```typescript
{
  id: string;
  name: string;
  color: string;
}
```

### Score
```typescript
{
  id: string;
  gameId: string;
  playerId: string;
  score: number;
  result: 'win' | 'loss' | 'draw';
  datePlayed: number;
  notes?: string;
}
```

### Preferences
```typescript
{
  remindersEnabled: boolean;
  reminderTime: string; // HH:MM format
  favoriteGameIds: string[];
}
```

## Animations & Interactions

- **Card Press**: Scale down to 0.97, opacity 0.9
- **Score Submission**: Success checkmark animation with haptic feedback
- **Tab Switch**: Smooth cross-fade transition
- **Modal Presentation**: Slide up from bottom with spring animation
- **Pull-to-Refresh**: Standard iOS refresh control

## Accessibility

- All interactive elements minimum 44pt touch target
- Sufficient color contrast (WCAG AA)
- VoiceOver support for all UI elements
- Dynamic Type support for text scaling
- Haptic feedback for important actions

## Initial Game Library (Pre-loaded)

1. **Wordle** - Word Games - https://www.nytimes.com/games/wordle
2. **NYT Mini Crossword** - Puzzles - https://www.nytimes.com/crosswords/game/mini
3. **LinkedIn Queens** - Strategy - https://www.linkedin.com/games/queens/
4. **LinkedIn Pinpoint** - Word Games - https://www.linkedin.com/games/pinpoint/
5. **Connections** - Word Games - https://www.nytimes.com/games/connections
6. **Spelling Bee** - Word Games - https://www.nytimes.com/puzzles/spelling-bee
7. **Sudoku** - Puzzles - https://www.nytimes.com/puzzles/sudoku/easy

## Technical Implementation Notes

- Use AsyncStorage for all data persistence
- Use Expo WebBrowser for opening game URLs
- Use Expo Notifications for daily reminders
- Use Haptics for tactile feedback
- Use FlatList for game list performance
- Use React Navigation for modal presentations
