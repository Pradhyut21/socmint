# Instagram Profile Picture Debugging

## Issue
When searching for `kishansaaaai`, the app should fetch the **actual Instagram profile picture** but shows a placeholder instead.

## How It Should Work

The app uses Instagram's **internal web API** (the same one Instagram's website uses) to fetch profile data including the profile picture.

### API Endpoint:
```
https://www.instagram.com/api/v1/users/web_profile_info/?username=kishansaaaai
```

### Headers Required:
```
x-ig-app-id: 936619743392459
x-requested-with: XMLHttpRequest
Referer: https://www.instagram.com/
Accept: application/json
```

### Response Should Include:
```json
{
  "data": {
    "user": {
      "username": "kishansaaaai",
      "full_name": "Your Name",
      "biography": "Your bio",
      "profile_pic_url_hd": "https://instagram.com/.../profile_pic.jpg",
      "profile_pic_url": "https://instagram.com/.../profile_pic_smaller.jpg",
      "edge_followed_by": { "count": 123 }
    }
  }
}
```

---

## Debugging Steps

### 1. Check Server Console

After searching for `kishansaaaai`, check the terminal where `npm run dev` is running.

**Look for:**
```
[DEBUG] Instagram avatar for kishansaaaai: https://...
```

### Possible Outputs:

**✅ Success:**
```
[DEBUG] Instagram avatar for kishansaaaai: https://scontent.cdninstagram.com/v/t51.2885-19/...jpg
```
- Real Instagram CDN URL = **Profile picture fetched successfully!**

**❌ Failure:**
```
[DEBUG] Instagram avatar for kishansaaaai: null
```
or
```
[DEBUG] Instagram avatar for kishansaaaai: undefined
```
- Null/undefined = **API call failed or returned no data**

---

## Common Issues & Solutions

### Issue 1: Instagram API Rate Limiting
**Symptoms:**
- First search works, subsequent searches fail
- Console shows: `undefined` or `null` for avatar

**Solution:**
- Wait 1-2 minutes between searches
- Instagram limits requests from same IP

### Issue 2: Instagram Changed API
**Symptoms:**
- Always returns `null` even on first try
- HTTP 403 or 401 errors

**Solution:**
- Instagram may have changed their internal API
- Need to update the `x-ig-app-id` header
- Check if Instagram updated their web app

### Issue 3: Private Account
**Symptoms:**
- Returns data but `is_private: true`
- No profile picture URL

**Solution:**
- Private accounts don't expose profile pictures publicly
- This is expected behavior
- Shows placeholder instead

### Issue 4: Account Doesn't Exist
**Symptoms:**
- HTTP 404 response
- No data returned

**Solution:**
- Double-check username spelling: `kishansaaaai` vs `kishansaaai`
- Verify account exists by visiting: https://www.instagram.com/kishansaaaai/

---

## Testing

### Step 1: Search
1. Go to: http://localhost:3000
2. Search for: `kishansaaaai`
3. Wait for results

### Step 2: Check Server Console
**In the terminal running `npm run dev`, look for:**

```
[DEBUG] Instagram avatar for kishansaaaai: <URL HERE>
```

### Step 3: Verify Result

**If URL is present:**
- Copy the URL
- Paste in browser
- Should show the actual Instagram profile picture

**If null/undefined:**
- Check "Common Issues" above
- Try searching for a different Instagram username (like `instagram` - official account)

---

## Alternative Test

### Test with Official Instagram Account:

1. Search for: `instagram`
2. Check console for:
   ```
   [DEBUG] Instagram avatar for instagram: https://...
   ```
3. This should **always work** since it's Instagram's official account

**If this fails:**
- Instagram API is blocked or changed
- Need to investigate further

---

## Manual API Test

### Test the Instagram API directly:

**In your browser console (F12 → Console tab):**

```javascript
fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=kishansaaaai', {
  headers: {
    'x-ig-app-id': '936619743392459',
    'x-requested-with': 'XMLHttpRequest'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Profile Pic HD:', data.data.user.profile_pic_url_hd);
  console.log('Profile Pic:', data.data.user.profile_pic_url);
  console.log('Full Data:', data);
});
```

**Expected Output:**
```
Profile Pic HD: https://scontent.cdninstagram.com/v/t51.2885-19/...jpg
Profile Pic: https://scontent.cdninstagram.com/v/t51.2885-19/...jpg
Full Data: {data: {user: {...}}}
```

**If you get an error:**
- `403 Forbidden` = Instagram blocked the request (need to update headers)
- `404 Not Found` = Username doesn't exist
- `CORS error` = Expected (browser blocking), but shows API works

---

## Code Flow

### Where Profile Picture is Fetched:

**File:** `lib/fetchers/social.ts`  
**Function:** `probePublicProfile()`  
**Line:** ~852-900

```typescript
// Instagram: use internal web API
const igApiResp = await fetchWithTimeout(
  `https://www.instagram.com/api/v1/users/web_profile_info/?username=${igUser}`,
  5500,
  {
    headers: {
      "x-ig-app-id": "936619743392459",
      "x-requested-with": "XMLHttpRequest",
      Referer: "https://www.instagram.com/",
      Accept: "application/json",
    },
  }
);

const igData = await igApiResp.json();
const igProfile = igData?.data?.user;

const instagramMeta: InstagramMeta = {
  username: igProfile.username || igUser,
  displayName: igProfile.full_name || null,
  bio: igProfile.biography || null,
  website: igProfile.external_url || null,
  followers: String(igProfile.edge_followed_by?.count ?? 0),
  avatar: igProfile.profile_pic_url_hd || igProfile.profile_pic_url || null, // ← Profile picture here!
  profileUrl: url,
};
```

### Where It's Used:

**File:** `lib/liveSocmint.ts`  
**Line:** ~885-890

```typescript
if (probe.platform === "instagram" && !profilePicUrl) {
  const instagramAvatar = (result as any).instagramMeta?.avatar;
  console.log(`[DEBUG] Instagram avatar for ${normalized}:`, instagramAvatar); // ← Debug log
  profilePicUrl = instagramAvatar || `<fallback>`;
}
```

---

## Next Steps

### 1. Search for `kishansaaaai`
- Check server console for debug log

### 2. If Avatar URL Shows:
- ✅ **Working!** Profile picture should display
- If not, check browser console for image loading errors

### 3. If Avatar is Null/Undefined:
- Try `instagram` (official account)
- If that fails too, Instagram API may be blocked
- Try manual API test (see above)

### 4. If Manual Test Works but App Doesn't:
- Check for typos in username
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)

---

## Status

✅ Debug logging added  
✅ Instagram API implementation exists  
✅ Ready to test  

**Search for `kishansaaaai` and check the server console!** 🔍

The debug log will tell us exactly what's happening with the Instagram API call.
