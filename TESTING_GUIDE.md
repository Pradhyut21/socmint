# Testing Guide - New Platforms

## Server Running ✅

Your development server is running at:
- **Local**: http://localhost:3001
- **Network**: http://192.168.56.1:3001

(Port 3001 is used because 3000 was already occupied)

---

## How to Test the New Platforms

### Option 1: Using the Investigation Page

1. Open http://localhost:3001 in your browser
2. Navigate to the investigation/search page
3. Enter a test username (see below for suggestions)
4. Run the investigation
5. Check the "Linked Accounts" tab to see the new platforms

### Option 2: Using the API Directly

Test the investigation API endpoint:

```bash
curl -X POST http://localhost:3001/api/investigate \
  -H "Content-Type: application/json" \
  -d '{"query": "hikaru", "type": "username"}'
```

Or in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/investigate" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"query":"hikaru","type":"username"}'
```

---

## Test Usernames for New Platforms

### Chess.com (High Success Rate)
- `hikaru` - GM Hikaru Nakamura (3000+ rating, verified)
- `magnuscarlsen` - World Chess Champion
- `gothamchess` - Popular chess streamer
- `anna_chess` - WGM Anna Cramling

**What to check:**
- ✅ Profile found
- ✅ Rating displayed (Bullet, Blitz, Rapid)
- ✅ Follower count
- ✅ Title (GM, IM, etc.)

### LeetCode (High Success Rate)
- `tourist` - Legendary competitive programmer
- `neal_wu` - Google engineer, competitive programmer
- `Errichto` - Competitive programming YouTuber

**What to check:**
- ✅ Profile found
- ✅ Problems solved count
- ✅ Ranking displayed
- ✅ Reputation shown

### Stack Overflow (High Success Rate)
- `22656` - Jon Skeet (highest rep user, 1M+)
- `1` - Jeff Atwood (Stack Overflow co-founder)
- `6309` - Marc Gravell (second highest rep)

**What to check:**
- ✅ Profile found
- ✅ Reputation displayed
- ✅ Badges shown (Gold, Silver, Bronze)
- ✅ Location if available

### Duolingo (Moderate Success Rate)
- Any valid username
- Try common names: `john`, `maria`, `alex`

**What to check:**
- ✅ Profile found
- ✅ XP displayed
- ✅ Streak shown
- ✅ Learning language

### Freelancer.com (Moderate Success Rate)
- Any freelancer username
- Try: `developer123`, `designer456`

**What to check:**
- ✅ Profile found
- ✅ Display name
- ✅ Tagline/bio
- ✅ Reviews count

### Keybase (High Success Rate)
- `chris` - Keybase CEO
- `max` - Keybase founder
- `malgorithms` - Keybase co-founder

**What to check:**
- ✅ Profile found
- ✅ Full name displayed
- ✅ Bio shown
- ✅ Verified proofs count

### Threads (High Success Rate - Instagram usernames)
- `zuck` - Mark Zuckerberg
- `instagram` - Official Instagram account
- Any popular Instagram username

**What to check:**
- ✅ Profile found
- ✅ Display name extracted
- ✅ Bio visible

---

## Expected Behavior

### Success Case:
When a platform finds a profile, you should see:

```json
{
  "platform": "Chess.com",
  "username": "hikaru",
  "profileUrl": "https://www.chess.com/member/hikaru",
  "displayName": "Hikaru Nakamura",
  "bio": "Chess.com player. GM Rapid: 3200. 500K followers.",
  "profilePicUrl": "...",
  "confidence": "CONFIRMED"
}
```

### Failure Case (Profile Not Found):
The platform simply won't appear in results - this is normal and expected!

### Partial Data:
Some platforms may return limited data (just name + bio) if:
- API is rate-limited
- Profile is private
- Data is not publicly available

---

## Debugging

### Check Browser Console:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors during investigation

### Check Network Tab:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Run an investigation
4. Look for the `/api/investigate` request
5. Check the response to see which platforms returned data

### Check Server Logs:
Look at the terminal where `npm run dev` is running:
- API calls are logged
- Errors are shown in red
- Platform probe results may be logged

---

## What You Should See

### In the UI (Linked Accounts Tab):

**Before (20 platforms):**
- GitHub, Reddit, Twitter, Instagram, Facebook, etc.

**After (32 platforms):**
- All previous platforms +
- Chess.com ⭐
- LeetCode ⭐
- Stack Overflow ⭐
- Freelancer ⭐
- Duolingo ⭐
- Keybase ⭐
- Threads ⭐
- Dribbble
- CodePen
- Behance
- Twitch
- Kaggle

(⭐ = Full API with rich data)

---

## Common Issues & Solutions

### Issue: Platform not showing up
**Cause**: Profile doesn't exist on that platform
**Solution**: This is normal! Not every username exists on every platform

### Issue: "Limited data" message
**Cause**: No authentication provided, using HTML fallback
**Solution**: This is expected and safe (no auth required)

### Issue: Some platforms timeout
**Cause**: Network latency or rate limiting
**Solution**: This is normal, we have 5-8 second timeouts

### Issue: Instagram/Twitter data incomplete
**Cause**: These platforms often have login walls
**Solution**: This is expected without authentication

---

## Performance Testing

### Test Query: "hikaru"
**Expected results:**
- Chess.com: ✅ (Full data)
- GitHub: Depends if user exists
- LeetCode: Depends if user exists
- Stack Overflow: Depends if user exists
- Other platforms: Depends on existence

**Time**: Should complete in 15-30 seconds (all 32 platforms probed in parallel)

### Test Query: "nonexistent_username_12345"
**Expected results:**
- Most platforms: Not found (expected)
- Time: Should complete in 15-30 seconds

---

## API Response Example

```json
{
  "title": "Username search: hikaru",
  "generated_at": "2026-07-04T12:45:00Z",
  "summary": [
    {
      "label": "Query",
      "value": "hikaru"
    },
    {
      "label": "Profile results",
      "value": 8
    }
  ],
  "data": {
    "results": [
      {
        "platform": "Chess.com",
        "username": "hikaru",
        "displayName": "Hikaru Nakamura",
        "bio": "Chess.com player. GM Rapid: 3200...",
        "profileUrl": "https://www.chess.com/member/hikaru"
      },
      // ... more platforms
    ]
  },
  "profile": {
    "accounts": [
      // Full account data
    ]
  }
}
```

---

## Success Criteria ✅

Your implementation is working correctly if:

1. ✅ Server starts without errors
2. ✅ Investigation page loads
3. ✅ Can submit a username search
4. ✅ At least some new platforms appear (Chess.com, LeetCode, etc.)
5. ✅ Profile data is displayed correctly
6. ✅ No console errors
7. ✅ Investigation completes in reasonable time (15-30 sec)

---

## Quick Test Commands

### Test Chess.com specifically:
```bash
# In terminal
curl "https://api.chess.com/pub/player/hikaru"
```

### Test LeetCode specifically:
```bash
# In terminal  
curl -X POST "https://leetcode.com/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query":"query{matchedUser(username:\"tourist\"){username}}"}'
```

### Test Stack Overflow specifically:
```bash
curl "https://api.stackexchange.com/2.3/users/22656?site=stackoverflow"
```

All should return JSON data if APIs are working.

---

## Next Steps After Testing

1. ✅ Test with multiple usernames
2. ✅ Verify data accuracy
3. ✅ Check UI display
4. ✅ Test error cases
5. ⏳ Fix any issues found
6. ⏳ Push to GitHub (after fixing email privacy)
7. ⏳ Create PR to main branch

---

## Stop the Server

When done testing:
```bash
Ctrl + C
```

Or in PowerShell:
```powershell
taskkill /PID 23704 /F
```

---

**Happy Testing! 🎉**

All 12 new platforms are ready to test. The most reliable ones to try first are:
- Chess.com (`hikaru`, `magnuscarlsen`)
- Stack Overflow (`22656`, `1`)
- Keybase (`chris`, `max`)

These will give you immediate visual confirmation that the new platforms are working!
