# Supabase Authentication Setup

## Issue
The app is showing "ACCESS DENIED — Failed to fetch" because Supabase credentials are not configured.

## Quick Setup (5 minutes)

### Option 1: Use Real Supabase (Recommended)

1. **Create a Supabase Account**
   - Go to https://supabase.com
   - Sign up for a free account (no credit card required)

2. **Create a New Project**
   - Click "New Project"
   - Choose any name (e.g., "socmint-shield-dev")
   - Set a database password (save it somewhere)
   - Select a region close to you
   - Wait ~2 minutes for provisioning

3. **Get Your API Credentials**
   - Go to **Project Settings** > **API**
   - Copy the **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy the **anon/public key** (long string starting with `eyJ...`)

4. **Update `.env.local` File**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. **Restart the Development Server**
   ```bash
   # Stop the current server (Ctrl+C in the terminal)
   npm run dev
   ```

6. **Sign Up**
   - Go to http://localhost:3001/auth
   - Click "Create Access" tab
   - Enter any email and password (min 6 characters)
   - You'll receive a confirmation email
   - Click the link to confirm (or check Supabase dashboard)

### Option 2: Bypass Authentication (Development Only)

If you want to test the platform features without authentication, I can modify the code to bypass the auth requirement temporarily.

**Warning:** This is only for local testing. Never deploy without proper authentication!

## Current Status

✅ Supabase package installed (`@supabase/supabase-js`)  
❌ Environment variables not configured  
❌ Authentication failing with "Failed to fetch"  

## After Setup

Once Supabase is configured:
- ✅ Sign up with any email/password
- ✅ Automatic email verification
- ✅ Secure session management
- ✅ Access to all platform features
- ✅ Test the new social media platforms we added

## Need Help?

If you prefer to skip authentication for now, let me know and I can temporarily disable it so you can test the social media fetching features immediately.

## Testing the Social Platforms

Once authenticated, test these usernames:
- **Chess.com**: `hikaru`, `magnuscarlsen`
- **LeetCode**: `tourist`, `neal_wu`
- **Stack Overflow**: `22656` (Jon Skeet)
- **Keybase**: `chris`, `max`
- **Threads**: `zuck`

The investigation page will show results from all 32 platforms!
