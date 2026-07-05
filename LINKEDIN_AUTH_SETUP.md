# LinkedIn Authentication Setup Guide

## Overview
The application supports **authenticated LinkedIn scraping** to get richer profile data including:
- ✅ Full profile information (name, headline, summary, location)
- ✅ Work experiences with detailed descriptions
- ✅ Education history with institutions and degrees  
- ✅ Profile pictures and avatars
- ✅ Connection counts and follower data
- ✅ Skills, certifications, and endorsements

## How It Works

The LinkedIn provider has **4 fallback layers**:

1. **Authenticated Voyager API** (Best quality - requires auth tokens)
2. **Public HTML scraping** (Good quality - no auth needed)
3. **Search engine index parsing** (Limited quality - fallback)
4. **Demo data** (Last resort - for testing only)

With authentication, you get **Layer 1** access with the highest quality data.

---

## Step-by-Step Setup

### Step 1: Get Your LinkedIn Cookies

1. **Open LinkedIn** in your browser and log in to your account
2. **Open DevTools**:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I`
   - Firefox: Press `F12` or `Ctrl+Shift+K`
3. **Go to Cookies**:
   - Click the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
   - In the sidebar, expand **Cookies**
   - Click on `https://www.linkedin.com`
4. **Copy the values**:
   - Find the cookie named `li_at` → Copy its **Value** (starts with `AQE...`)
   - Find the cookie named `JSESSIONID` → Copy its **Value** (format: `"ajax:XXXXXXXXXX"`)

### Step 2: Add Tokens to .env.local

1. Open the file: `.env.local` in your project root
2. Find the LinkedIn section (around line 8-12)
3. Paste your cookie values:

```env
# LinkedIn Authentication
LINKEDIN_LI_AT=AQEDARxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINKEDIN_JSESSIONID="ajax:1234567890123456789"
```

**Important Notes:**
- ✅ Keep the quotes around JSESSIONID value
- ✅ Don't share these tokens - they give access to your LinkedIn account
- ✅ These tokens expire after ~1 year or when you log out
- ⚠️ **Security**: Never commit `.env.local` to git (it's already in `.gitignore`)

### Step 3: Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
# Start it again
npm run dev
```

### Step 4: Verify It's Working

Search for any LinkedIn username and check the server console:

```
[LINKEDIN] Initiating authenticated Voyager API extraction for "username"...
[LINKEDIN] ✓ Authenticated extraction successful
```

If you see this, authentication is working! 🎉

---

## Troubleshooting

### "Authenticated extraction failed" Error

**Possible causes:**
1. **Token expired**: Get fresh cookies from LinkedIn (re-login if needed)
2. **Token format wrong**: Make sure JSESSIONID has quotes: `"ajax:123..."`
3. **LinkedIn session blocked**: LinkedIn may detect automated access (use less frequently)
4. **Network/firewall issue**: Check if you can access LinkedIn from the server

**Solution**: The system will automatically fall back to public HTML scraping (Layer 2)

### No LinkedIn Data Showing

1. **Check if username exists**: Visit `https://www.linkedin.com/in/username` manually
2. **Check console logs**: Look for `[LINKEDIN]` messages in server console
3. **Verify .env.local**: Make sure tokens are on the correct lines

### LinkedIn Rate Limiting

LinkedIn may rate-limit requests if you search too frequently:
- ⚠️ **Limit**: ~5-10 searches per minute (authenticated)
- ✅ **Solution**: The system caches results automatically
- 💡 **Tip**: Space out searches by 10-15 seconds

---

## Security Best Practices

1. ✅ **Never share** your `li_at` or `JSESSIONID` tokens
2. ✅ **Rotate tokens** every few months (log out and log back in)
3. ✅ **Use a dedicated account** (optional) - create a separate LinkedIn account for OSINT
4. ✅ **Monitor your LinkedIn account** for suspicious activity
5. ⚠️ **Don't commit** `.env.local` to version control

---

## What Data You'll Get

### Without Authentication (Public HTML):
- ✅ Name
- ✅ Headline
- ⚠️ Limited experience data
- ⚠️ Limited education data

### With Authentication (Voyager API):
- ✅ Full name
- ✅ Profile picture URL
- ✅ Complete headline
- ✅ Summary/About section
- ✅ Location
- ✅ **Detailed work experiences**:
  - Company name
  - Job title
  - Duration (start/end dates)
  - Description
- ✅ **Complete education history**:
  - Institution name
  - Degree type
  - Field of study
  - Duration
- ✅ Connection count
- ✅ Skills and endorsements

---

## Example Output

### Authenticated Response:
```json
{
  "fullName": { "value": "John Doe", "confidence": 100, "verificationStatus": "VERIFIED" },
  "headline": { "value": "Software Engineer at Tech Company" },
  "location": { "value": "San Francisco, CA" },
  "experiences": [
    {
      "title": { "value": "Senior Software Engineer" },
      "company": { "value": "Tech Company" },
      "duration": { "value": "Jan 2020 - Present" },
      "description": { "value": "Leading backend development..." }
    }
  ],
  "educations": [
    {
      "institution": { "value": "Stanford University" },
      "degree": { "value": "BS Computer Science" },
      "duration": { "value": "2016 - 2020" }
    }
  ]
}
```

---

## FAQ

**Q: Will LinkedIn detect this?**
A: The authenticated API uses the same endpoints as the official LinkedIn website. However, excessive usage may trigger rate limiting.

**Q: Can I use someone else's LinkedIn account?**
A: Technically yes, but this violates LinkedIn's Terms of Service. Use your own account.

**Q: How often do tokens expire?**
A: LinkedIn cookies typically last 1 year or until you log out.

**Q: Can I use multiple accounts?**
A: Not simultaneously. You can switch accounts by updating the tokens in `.env.local`.

**Q: Is this legal?**
A: Scraping public LinkedIn data for OSINT purposes falls into a legal gray area. Check your local laws and LinkedIn's Terms of Service.

---

## Support

If you need help:
1. Check the server console logs for `[LINKEDIN]` messages
2. Verify your cookies are fresh and correctly formatted
3. Test with a known LinkedIn username
4. Check if the fallback (public HTML) is working

The system is designed to **always work** even without authentication, but auth provides much better data quality.
