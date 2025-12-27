# Supabase Setup Instructions

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: daily-games-hub (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely)
   - **Region**: Choose closest to your location
5. Click "Create new project" and wait for it to provision (~2 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the entire contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see a success message and verification results at the bottom

**Expected output:**
```
table_name     | column_count
---------------|-------------
games          | 13
preferences    | 5
scores         | 9
user_profiles  | 6

tablename      | rowsecurity
---------------|-------------
games          | t
preferences    | t
scores         | t
user_profiles  | t
```

## Step 3: Enable Authentication Providers

### Email/Password (Already enabled by default)
✅ No action needed

### Google OAuth (Optional but recommended)

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google**
4. You'll need to create a Google OAuth app:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: Copy from Supabase (shown in the provider settings)
   - Copy **Client ID** and **Client Secret** to Supabase
5. Click **Save**

### Apple Sign-In (Optional, iOS only)

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Find **Apple** and click to expand
3. Toggle **Enable Sign in with Apple**
4. You'll need an Apple Developer account:
   - Go to [Apple Developer](https://developer.apple.com/)
   - Create a Service ID
   - Enable Sign In with Apple
   - Configure domains and redirect URLs
   - Copy credentials to Supabase
5. Click **Save**

## Step 4: Get Your API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values (you already provided them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)

## Step 5: Verify Setup

Run the test in your project:
```bash
pnpm test supabase-connection.test.ts
```

If the test passes, you're all set! ✅

## Database Schema Overview

### Tables Created

1. **user_profiles** - User profile information (name, avatar, privacy settings)
2. **games** - User's game library (name, URL, category, streaks, notes)
3. **scores** - Game scores and results (score, win/loss/draw, date)
4. **preferences** - User preferences (reminders, notification settings)

### Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own data
- All operations are authenticated via Supabase Auth
- No cross-user data access (prepared for Phase 3 friends system)

### Indexes

Indexes are created for:
- User ID lookups (fast queries)
- Game categories (filtering)
- Score dates (sorting by date)
- Favorites (quick access to starred games)

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the migration SQL script
- Check that you're in the correct project
- Verify tables exist in **Database** → **Tables**

### "permission denied" error
- Check that RLS policies are created
- Verify you're authenticated (check auth token)
- Make sure user_id matches auth.uid()

### Connection timeout
- Check your internet connection
- Verify Supabase project is active (not paused)
- Check project URL and API key are correct

## Next Steps

After completing this setup:
1. Authentication screens will be implemented
2. Data migration from AsyncStorage will be configured
3. Sync logic will be added
4. You'll be able to login and see your data in the cloud!
