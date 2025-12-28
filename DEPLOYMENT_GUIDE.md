# Daily Games Hub - PWA Deployment Guide

This guide will help you deploy your Daily Games Hub app as a Progressive Web App (PWA) that you and your wife can add to your iPhone home screens.

## Prerequisites

- A GitHub account (free)
- A Vercel account (free) - sign up at [vercel.com](https://vercel.com)
- Your Supabase credentials (already configured in the project)

---

## Option 1: Deploy via Vercel (Recommended - Easiest)

### Step 1: Push to GitHub

1. Go to [github.com](https://github.com) and create a new repository called `daily-games-hub`
2. Make it **Private** (since it contains your personal app)
3. Don't initialize with README (we already have files)

4. In your local project, run these commands:

```bash
cd /home/ubuntu/daily-games-hub
git init
git add .
git commit -m "Initial commit - Daily Games Hub PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-games-hub.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `daily-games-hub` repository
4. Vercel will auto-detect the settings, but verify:
   - **Framework Preset**: Other
   - **Build Command**: `npx expo export --platform web`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

5. **Add Environment Variables** (IMPORTANT):
   Click "Environment Variables" and add:
   - `SUPABASE_URL` = (your Supabase project URL)
   - `SUPABASE_ANON_KEY` = (your Supabase anon key)

6. Click "Deploy"

### Step 3: Wait for Deployment

- First deployment takes 2-3 minutes
- Vercel will give you a URL like: `https://daily-games-hub-xyz.vercel.app`
- This URL is permanent and will work on any device!

---

## Option 2: Deploy via Netlify (Alternative)

### Step 1: Push to GitHub

(Same as Vercel Step 1 above)

### Step 2: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click "Add new site" → "Import an existing project"
3. Choose GitHub and select your `daily-games-hub` repository
4. Configure build settings:
   - **Build command**: `npx expo export --platform web`
   - **Publish directory**: `dist`
   - **Base directory**: (leave empty)

5. **Add Environment Variables**:
   - Go to Site settings → Environment variables
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

6. Click "Deploy site"

---

## Adding to iPhone Home Screen

Once deployed, follow these steps on your iPhone:

### For You:

1. Open **Safari** on your iPhone (must use Safari, not Chrome)
2. Go to your deployed URL (e.g., `https://daily-games-hub-xyz.vercel.app`)
3. Tap the **Share** button (square with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Edit the name if you want (e.g., "Games Hub")
6. Tap **"Add"**

The app icon will appear on your home screen like a native app!

### For Your Wife:

1. Share the URL with her (text, email, etc.)
2. She follows the same steps above on her iPhone
3. Both of you will have the app on your home screens

---

## How It Works

### PWA Features:

✅ **Standalone Mode**: Opens full-screen without Safari UI  
✅ **Custom Icon**: Shows your app icon on home screen  
✅ **Offline Support**: Basic offline functionality (AsyncStorage works offline)  
✅ **Cross-Device Sync**: Data syncs via Supabase when online  
✅ **Fast Loading**: Cached assets load instantly  

### What Happens When You Use It:

1. **First Launch**: Downloads app assets, connects to Supabase
2. **Subsequent Launches**: Loads instantly from cache
3. **Data Sync**: Automatically syncs scores, games, and profile when online
4. **Offline Mode**: Can still view data and add scores (syncs when back online)

---

## Updating the App

When you make changes:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

2. Vercel/Netlify automatically rebuilds and deploys (takes 2-3 minutes)

3. Users see updates next time they open the app (may need to close and reopen)

---

## Custom Domain (Optional)

If you want a custom domain like `games.yourdomain.com`:

### Vercel:
1. Go to your project settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS as instructed

---

## Troubleshooting

### "Add to Home Screen" not showing:
- Make sure you're using Safari (not Chrome or other browsers)
- The site must be served over HTTPS (Vercel/Netlify do this automatically)
- Try refreshing the page first

### App not loading:
- Check that environment variables are set correctly in Vercel/Netlify
- Verify Supabase credentials are correct
- Check browser console for errors (Safari → Develop → Show Web Inspector)

### Data not syncing:
- Ensure you're logged in (authentication required for sync)
- Check internet connection
- Verify Supabase is accessible (check dashboard)

### Build failing on Vercel/Netlify:
- Check build logs for specific errors
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility (should use Node 18+)

---

## Security Notes

- Your Supabase credentials are safe in environment variables (not exposed to users)
- Row Level Security (RLS) in Supabase protects user data
- HTTPS encryption protects data in transit
- Keep your GitHub repository private to protect your code

---

## Support

If you encounter issues:
1. Check the build logs in Vercel/Netlify dashboard
2. Verify environment variables are set correctly
3. Test the app in Safari on desktop first
4. Check Supabase dashboard for database connectivity

---

## Quick Reference

**Your Deployment URL**: (will be provided after deployment)  
**GitHub Repository**: https://github.com/YOUR_USERNAME/daily-games-hub  
**Vercel Dashboard**: https://vercel.com/dashboard  
**Netlify Dashboard**: https://app.netlify.com  
**Supabase Dashboard**: https://supabase.com/dashboard  

---

## Next Steps After Deployment

1. ✅ Deploy to Vercel/Netlify
2. ✅ Add to both iPhones' home screens
3. ✅ Create your profiles and set usernames
4. ✅ Add each other as friends
5. ✅ Start tracking your daily games!
6. 🎮 Compete on streaks and scores

Enjoy your personal Daily Games Hub! 🎉
