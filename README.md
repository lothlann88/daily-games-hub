# Daily Games Hub 🎮

A beautiful, modern mobile app for tracking daily games, scores, and streaks. Built with React Native and Expo, Daily Games Hub provides a centralized location for you and your partner to play various daily games like Wordle, NYT Mini, LinkedIn games, and more.

![Daily Games Hub](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue) ![React Native](https://img.shields.io/badge/React%20Native-0.81-blue) ![Expo](https://img.shields.io/badge/Expo-SDK%2054-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)

## ✨ Features

### 🎯 Game Management
- **13 Pre-loaded Games**: Wordle, NYT Mini, Connections, Spelling Bee, Strands, LinkedIn Pinpoint, LinkedIn Queens, Geoguessr, Bandle, Guardian Daily Mini, Reunion, Sudoku, and Waffle
- **Real Game Logos**: Automatically fetches official logos from game websites
- **Add Custom Games**: Easily add new daily games with custom icons and URLs
- **Category Organization**: Games organized by Word Games, Puzzles, Strategy, and Trivia
- **Search & Filter**: Quickly find games with search bar and category filters
- **Favorites**: Star your favorite games for quick access

### 📊 Score Tracking & Competition
- **Two-Player System**: Track scores for you and your partner
- **Head-to-Head Leaderboard**: See who's winning with detailed statistics
- **Time Period Filters**: View stats for week, month, or all-time
- **Game-by-Game Breakdown**: Detailed win/loss records for each game
- **Quick Score Entry**: Log scores immediately after playing

### 🔥 Streak Tracking
- **Current Streaks**: Track consecutive days played for each game
- **Longest Streaks**: Remember your best streaks
- **Visual Calendar**: Monthly calendar view showing play history
- **Play Indicators**: Green dots for played days, purple for today
- **Streak Stats**: Total plays, current streak, and longest streak per game

### 📅 Calendar View
- **Monthly Calendar**: Visual representation of your play history
- **Color-Coded Days**: Easily see which days you played
- **Streak Visualization**: See your streaks at a glance
- **Multiple Months**: Navigate through past and future months

### 💾 Data Management
- **Export Data**: Backup all games, scores, and settings to JSON
- **Import Data**: Restore from backup files
- **Merge or Replace**: Choose to merge data or replace completely
- **Share via AirDrop**: Easy sharing between devices
- **Cross-Device Sync**: Share data with your partner

### 🔔 Daily Reminders
- **Customizable Notifications**: Set daily reminders to play your games
- **Adjustable Time**: Choose when you want to be reminded
- **Toggle On/Off**: Enable or disable notifications anytime

### 🎨 Modern UI
- **Sophisticated Purple Theme**: Beautiful gradient-based design
- **Dark/Light Mode**: Automatic theme switching based on system preference
- **Smooth Animations**: Spring-based animations for delightful interactions
- **Haptic Feedback**: Tactile responses for actions
- **iOS-Native Feel**: Follows Apple Human Interface Guidelines
- **Long-Press Menus**: Intuitive context menus for game actions

## 📱 Screenshots

![Home Screen](./docs/screenshots/home.png)
*Browse your daily games with search and filters*

![Leaderboard](./docs/screenshots/leaderboard.png)
*Track your head-to-head competition*

![Calendar View](./docs/screenshots/calendar.png)
*Visualize your play history*

![Settings](./docs/screenshots/settings.png)
*Customize players and manage data*

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **pnpm** (comes with Node.js)
- **Expo Go** app on your iOS or Android device ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lothlann88/daily-games.git
   cd daily-games
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   pnpm start
   ```

4. **Open on your device**
   - Open **Expo Go** on your phone
   - Scan the QR code displayed in your terminal
   - The app will load on your device

### Running on Specific Platforms

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) 0.81
- **Platform**: [Expo](https://expo.dev/) SDK 54
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.9
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) 6
- **Styling**: React Native StyleSheet with custom theme
- **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) 4
- **Storage**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- **Icons**: Custom SVG icons with Material Icons fallback
- **Gradients**: [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)

## 📂 Project Structure

```
daily-games-hub/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── index.tsx        # Home screen (game list)
│   │   ├── leaderboard.tsx  # Leaderboard screen
│   │   └── settings.tsx     # Settings screen
│   ├── game-detail.tsx      # Game detail modal
│   └── add-game.tsx         # Add game modal
├── components/              # Reusable components
│   ├── game-card-simple.tsx # Game card with long-press menu
│   ├── play-calendar.tsx    # Calendar visualization
│   ├── themed-text.tsx      # Themed text component
│   ├── themed-view.tsx      # Themed view component
│   └── ui/                  # UI components
│       ├── game-icons.tsx   # SVG game icons
│       └── icon-symbol.tsx  # Tab bar icons
├── constants/               # App constants
│   └── theme.ts            # Color theme definitions
├── hooks/                   # Custom React hooks
│   ├── use-storage.ts      # Storage hooks
│   └── use-theme-color.ts  # Theme color hook
├── lib/                     # Utility libraries
│   ├── storage.ts          # AsyncStorage utilities
│   ├── streaks.ts          # Streak calculation
│   ├── logo-fetcher.ts     # Logo fetching utility
│   ├── notifications.ts    # Notification scheduling
│   └── data-transfer.ts    # Import/export functionality
├── types/                   # TypeScript type definitions
│   └── index.ts            # App types
├── assets/                  # Static assets
│   └── images/             # App icons and images
├── app.config.ts           # Expo configuration
└── package.json            # Dependencies

```

## 🎮 How to Use

### Adding a Game

1. Tap the **+** button in the bottom-right corner
2. Enter the game name, URL, and select a category
3. Choose an icon (or let it fetch the logo automatically)
4. Tap **Add Game**

### Logging a Score

1. Tap on a game card to open the game detail
2. Tap **Play Now** to open the game in your browser
3. After playing, return to the app
4. Select the player and enter the result
5. Tap **Submit Score**

### Viewing Streaks

1. Open any game detail screen
2. Scroll down to see the calendar view
3. Green days = played, purple = today
4. View current streak and longest streak stats

### Managing Data

1. Go to **Settings** tab
2. Under **Data Management**:
   - Tap **Export Data** to create a backup
   - Tap **Import Data** to restore from backup
   - Choose **Replace All** or **Merge** when importing

### Setting Reminders

1. Go to **Settings** tab
2. Toggle **Daily Reminders** on
3. Tap the reminder time to adjust
4. Receive notifications at your chosen time

## 🔧 Configuration

### Customizing Theme Colors

Edit `constants/theme.ts` to change the app's color scheme:

```typescript
export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: "#7C3AED",  // Primary purple color
    // ... more colors
  },
  dark: {
    // Dark mode colors
  },
};
```

### Adding Default Games

Edit `lib/storage.ts` to modify the pre-loaded game list:

```typescript
const DEFAULT_GAMES: Game[] = [
  {
    id: "1",
    name: "Your Game",
    url: "https://yourgame.com",
    category: "Word Games",
    icon: "📝",
    // ... more properties
  },
];
```

### Changing App Name and Icon

1. **App Name**: Edit `app.config.ts`:
   ```typescript
   const env = {
     appName: 'Your App Name',
     // ...
   };
   ```

2. **App Icon**: Replace `assets/images/icon.png` with your custom icon (1024x1024px)

## 📦 Building for Production

### iOS

```bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

> **Note**: You'll need an [Expo Application Services (EAS)](https://expo.dev/eas) account to build and submit apps.

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Game logos are property of their respective owners
- Icons from [SF Symbols](https://developer.apple.com/sf-symbols/) and [Material Icons](https://fonts.google.com/icons)
- Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)

## 📧 Support

For questions or issues, please [open an issue](https://github.com/lothlann88/daily-games/issues) on GitHub.   

## 🗺️ Roadmap

- [ ] Weekly challenges and achievements
- [ ] Statistics dashboard with charts
- [ ] Game notes and strategies
- [ ] iOS home screen widget
- [ ] Cloud sync with user accounts
- [ ] Social features and friend leaderboards
- [ ] Custom game categories
- [ ] Streak freeze/protection
- [ ] Weekly summary notifications

---



**Made with ❤️ for daily game enthusiasts**
