# Phase 2: Authentication & Backend Integration

## Overview

Transform Daily Games Hub from a local-only app to a cloud-connected app with user authentication, cross-device sync, and preparation for social features (Phase 3).

## Goals

1. **User Authentication**: Email/password and social login (Google, Apple)
2. **Cloud Database**: Migrate from AsyncStorage to cloud database
3. **Data Sync**: Seamless sync between local and cloud storage
4. **Offline Support**: App continues to work offline with local data
5. **Account Management**: Profile editing, password reset, account deletion
6. **Privacy**: Private profiles by default, prepare for friends system

## Backend Choice: Supabase

**Why Supabase:**
- Built-in authentication (email, Google, Apple Sign-In)
- PostgreSQL database with real-time capabilities
- Row Level Security (RLS) for data privacy
- RESTful API and client libraries
- File storage for future avatar uploads
- Free tier sufficient for development and initial users
- Easier to migrate to custom backend later if needed

**Alternative considered:**
- Firebase: Good but more vendor lock-in, pricing concerns at scale
- Custom backend: More control but significantly more development time

## Architecture

### Data Flow

```
User Device (AsyncStorage) ↔ Supabase Client ↔ Supabase Cloud (PostgreSQL)
```

### Sync Strategy

**Hybrid Approach:**
1. **Local-first**: All operations write to AsyncStorage immediately
2. **Background sync**: Sync to cloud when online
3. **Conflict resolution**: Last-write-wins with timestamp comparison
4. **Initial load**: Fetch from cloud on app start, merge with local data

### Database Schema

#### Users Table (managed by Supabase Auth)
- `id` (UUID, primary key)
- `email` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### user_profiles Table
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### games Table
```sql
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  logo_url TEXT,
  icon TEXT,
  is_favorite BOOLEAN DEFAULT false,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  play_history JSONB DEFAULT '[]',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, id)
);

CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_category ON games(category);
```

#### scores Table
```sql
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  date_played BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, id)
);

CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_game_id ON scores(game_id);
CREATE INDEX idx_scores_date_played ON scores(date_played);
```

#### preferences Table
```sql
CREATE TABLE preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN DEFAULT false,
  reminder_time TEXT DEFAULT '09:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

All tables will have RLS enabled with policies:
- Users can only read/write their own data
- No cross-user data access (except for Phase 3 friends system)

Example for games table:
```sql
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own games"
  ON games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
  ON games FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
  ON games FOR DELETE
  USING (auth.uid() = user_id);
```

## Implementation Plan

### Phase 2.1: Setup & Configuration

1. **Create Supabase project**
   - Sign up for Supabase account
   - Create new project
   - Note down project URL and anon key

2. **Install dependencies**
   ```bash
   pnpm add @supabase/supabase-js
   ```

3. **Configure environment variables**
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to secrets
   - Update app.config.ts if needed

4. **Create database schema**
   - Run SQL migrations in Supabase dashboard
   - Set up RLS policies
   - Create indexes

### Phase 2.2: Authentication Implementation

1. **Create Supabase client**
   - `lib/supabase.ts` - Initialize Supabase client
   - Configure AsyncStorage for session persistence

2. **Authentication screens**
   - `app/auth/login.tsx` - Email/password login
   - `app/auth/register.tsx` - New user registration
   - `app/auth/forgot-password.tsx` - Password reset

3. **Social authentication**
   - Configure Google OAuth in Supabase
   - Configure Apple Sign-In in Supabase
   - Add social login buttons

4. **Auth state management**
   - Create `hooks/use-auth.ts` for auth state
   - Handle session persistence
   - Auto-refresh tokens

5. **Protected routes**
   - Update `app/_layout.tsx` to check auth state
   - Redirect to login if not authenticated
   - Show onboarding only for new users

### Phase 2.3: Data Migration & Sync

1. **Create sync utilities**
   - `lib/sync.ts` - Core sync logic
   - `lib/migration.ts` - Migrate AsyncStorage to Supabase

2. **Implement sync functions**
   - `syncGames()` - Sync games to/from cloud
   - `syncScores()` - Sync scores to/from cloud
   - `syncPreferences()` - Sync preferences to/from cloud
   - `syncUserProfile()` - Sync profile to/from cloud

3. **Conflict resolution**
   - Compare timestamps (local vs cloud)
   - Last-write-wins strategy
   - Log conflicts for debugging

4. **Migration flow**
   - On first login: Upload all local data to cloud
   - On subsequent logins: Merge cloud and local data
   - Handle edge cases (duplicate IDs, missing data)

### Phase 2.4: Update Storage Layer

1. **Dual-write strategy**
   - Update `lib/storage.ts` to write to both AsyncStorage and Supabase
   - Keep AsyncStorage as cache for offline access
   - Sync to cloud when online

2. **Update hooks**
   - Modify `useGames`, `useScores`, `usePreferences` to fetch from cloud
   - Add loading states for network requests
   - Handle errors gracefully

3. **Offline support**
   - Detect online/offline status
   - Queue operations when offline
   - Sync when back online

### Phase 2.5: UI Updates

1. **Login/Register screens**
   - Clean, modern iOS-style design
   - Email/password forms with validation
   - Social login buttons (Google, Apple)
   - "Forgot password?" link

2. **Account settings**
   - Update `app/(tabs)/settings.tsx`
   - Add "Account" section
   - Show email, change password, delete account
   - Add logout button

3. **Sync indicators**
   - Show sync status in UI (syncing, synced, offline)
   - Pull-to-refresh triggers sync
   - Toast notifications for sync errors

4. **Onboarding updates**
   - Show onboarding only for new users (not on every login)
   - Store onboarding completion in user_profiles table

## Authentication Flows

### New User Flow
1. User opens app → sees login screen
2. Taps "Sign Up"
3. Enters email, password, confirms password
4. Account created in Supabase Auth
5. Redirected to onboarding screen
6. Enters name → profile created in user_profiles table
7. Redirected to home screen (empty game library)

### Existing User (First Time on New Device) Flow
1. User opens app → sees login screen
2. Enters email and password
3. Authenticated via Supabase
4. App fetches user profile from cloud
5. App fetches games, scores, preferences from cloud
6. Redirected to home screen (with all their data)

### Existing User (Returning) Flow
1. User opens app
2. Session token valid → auto-login
3. Background sync starts
4. Redirected to home screen immediately (shows cached data)
5. Sync completes → UI updates if needed

### Social Login Flow
1. User taps "Sign in with Google" or "Sign in with Apple"
2. OAuth flow opens in browser/system dialog
3. User authorizes
4. Redirected back to app with token
5. If new user → onboarding
6. If existing user → home screen with data

## Data Migration Strategy

### First Login (Existing Local Data)
```
1. Check if user has local AsyncStorage data
2. If yes:
   a. Show "Migrating your data..." screen
   b. Upload all games to Supabase
   c. Upload all scores to Supabase
   d. Upload preferences to Supabase
   e. Mark migration as complete
   f. Keep local data as cache
3. If no:
   a. Fetch data from Supabase (if any)
   b. Cache in AsyncStorage
```

### Subsequent Logins
```
1. Fetch latest data from Supabase
2. Compare with local AsyncStorage
3. Merge using timestamps:
   - If cloud newer → update local
   - If local newer → update cloud
   - If equal → no action
4. Resolve conflicts (last-write-wins)
```

## Security Considerations

1. **Row Level Security**: All tables have RLS enabled
2. **Private by default**: User profiles are private
3. **No data leakage**: Users can only access their own data
4. **Secure tokens**: Use Supabase's built-in token management
5. **HTTPS only**: All API calls over HTTPS
6. **Password requirements**: Minimum 8 characters, enforced by Supabase

## Testing Strategy

1. **Unit tests**: Test sync logic, conflict resolution
2. **Integration tests**: Test auth flows, data migration
3. **Manual testing**:
   - Create account → add data → logout → login → verify data
   - Login on second device → verify data synced
   - Go offline → add data → go online → verify sync
   - Delete account → verify all data removed

## Rollout Plan

1. **Development**: Implement all features, test thoroughly
2. **Internal testing**: Test with personal accounts
3. **Beta testing**: Share with wife, test cross-device sync
4. **Production**: Deploy to TestFlight/App Store

## Future Enhancements (Phase 3)

- Friends system (add friends, compare scores)
- Leaderboards (friends-only)
- Achievements and badges
- Push notifications for friend activity
- Social sharing of scores

## Timeline Estimate

- Phase 2.1 (Setup): 1 hour
- Phase 2.2 (Auth): 3-4 hours
- Phase 2.3 (Sync): 4-5 hours
- Phase 2.4 (Storage): 2-3 hours
- Phase 2.5 (UI): 2-3 hours
- Testing: 2-3 hours

**Total: ~15-20 hours of development**

## Success Criteria

- ✅ Users can create accounts with email/password
- ✅ Users can login with Google/Apple
- ✅ All local data migrates to cloud on first login
- ✅ Data syncs across devices
- ✅ App works offline with local cache
- ✅ Users can logout and login again
- ✅ Users can reset password
- ✅ Users can delete account
- ✅ No data loss during migration
- ✅ RLS policies prevent unauthorized access
