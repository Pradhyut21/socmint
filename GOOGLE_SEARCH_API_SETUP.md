# Google Custom Search API Setup

## Overview

Use Google's official Custom Search API to find LinkedIn profiles - **no rate limiting**, **no bot detection**, **works perfectly**!

- ✅ **Free tier**: 100 queries/day
- ✅ **Paid tier**: $5 per 1,000 queries after that
- ✅ **Reliable**: Official Google API
- ✅ **No blocks**: No CAPTCHA or rate limits

---

## Step 1: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. **Create a project** (if you don't have one):
   - Click "Select a project" at the top
   - Click "NEW PROJECT"
   - Name: "SOCMINT Tool" (or anything)
   - Click "CREATE"

3. **Enable Custom Search API**:
   - Go to [Custom Search API](https://console.cloud.google.com/apis/library/customsearch.googleapis.com)
   - Click "ENABLE"

4. **Create API Key**:
   - Go to [Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "CREATE CREDENTIALS" → "API key"
   - Copy the API key (looks like: `AIzaSyAOThSECP868QpYGVDD66JZid2HDbz2tk4`)
   - (Optional) Click "RESTRICT KEY" to limit to Custom Search API only

---

## Step 2: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all)

2. Click "**Add**" to create a new search engine

3. **Configure the search engine**:
   - **Search engine name**: LinkedIn Profile Search
   - **What to search**: 
     - Select "Search the entire web"
     - OR add: `linkedin.com/*`
   - **Search settings**:
     - Enable "Search the entire web"
     - Enable "Image search" (optional)
   
4. Click "**CREATE**"

5. **Get Search Engine ID**:
   - Click on your new search engine
   - Look for "Search engine ID" (looks like: `7694f7cd3776143dd`)
   - Copy this ID

---

## Step 3: Add to .env.local

Open `.env.local` and add:

```env
# Google Custom Search API
GOOGLE_SEARCH_API_KEY=AIzaSyAOThSECP868QpYGVDD66JZid2HDbz2tk4
GOOGLE_SEARCH_ENGINE_ID=7694f7cd3776143dd
```

Replace with your actual values from Steps 1 and 2.

---

## Step 4: Test It

Run the test script:

```bash
node test_linkedin_google_api.js
```

Expected output:
```
✅ API Configured!
🔍 Searching for: williamhgates
✅ Found profile: Bill Gates
  URL: https://www.linkedin.com/in/williamhgates/
  Headline: Co-chair, Bill & Melinda Gates Foundation
```

---

## Usage Limits

### Free Tier
- **100 queries/day** - Free!
- Perfect for testing and moderate use

### Paid Tier
- **$5 per 1,000 queries** after 100/day
- That's **$0.005 per query** (half a cent)
- For 1,000 LinkedIn searches: $5
- For 10,000 searches: $50

### Cost Calculator
- **10 searches/day**: FREE (never hits paid tier)
- **200 searches/day**: $0.50/day = $15/month
- **1,000 searches/day**: $4.50/day = $135/month

---

## How It Works

The API performs this Google search:
```
site:linkedin.com/in/williamhgates
```

And returns:
- LinkedIn profile URL
- Name (from OpenGraph tags)
- Headline/title
- Description/bio
- Location (when available)

All extracted from Google's search results metadata!

---

## Advantages

### vs. Scraping LinkedIn directly
- ✅ No LinkedIn authentication needed
- ✅ No session cookies
- ✅ No rate limits or blocks
- ✅ No CAPTCHA
- ✅ Officially supported by Google

### vs. Scraping Google HTML
- ✅ No rate limiting (429 errors)
- ✅ Structured JSON response
- ✅ Reliable and fast
- ✅ Official API with SLA

### vs. LinkedIn Official API
- ✅ Much cheaper (LinkedIn Partner API costs $$$$)
- ✅ No application/approval process
- ✅ Works immediately
- ✅ Can search any public profile

---

## Troubleshooting

### "API key not valid"
**Solution**: 
1. Check if Custom Search API is enabled in your project
2. Verify the API key is copied correctly
3. Make sure there are no extra spaces

### "Search engine ID not found"
**Solution**:
1. Verify you created the Programmable Search Engine
2. Check the ID is copied correctly (no spaces)
3. Make sure the search engine is set to "Search the entire web"

### "Quota exceeded"
**Solution**:
- You've used your 100 free queries for today
- Wait until tomorrow (quota resets at midnight PST)
- OR enable billing to get more queries

### No results found
**Possible causes**:
- Profile username is incorrect
- Profile doesn't exist
- Profile is private/restricted

**Solution**: Try with a known public profile first (e.g., `williamhgates`)

---

## Security Notes

- ✅ **API Key**: Keep private, don't commit to git (already in `.gitignore`)
- ✅ **Restrict Key**: Optional but recommended - restrict to Custom Search API only
- ✅ **Monitor Usage**: Check Google Cloud Console for usage stats
- ✅ **Set Budget Alerts**: Set up billing alerts to avoid surprises

---

## Additional Resources

- [Custom Search JSON API Docs](https://developers.google.com/custom-search/v1/overview)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [API Console](https://console.cloud.google.com/apis/dashboard)
- [Usage Dashboard](https://console.cloud.google.com/apis/api/customsearch.googleapis.com/metrics)

---

## Summary

This is the **best solution** for LinkedIn profile discovery:
- ✅ Uses Google's official API
- ✅ No authentication hassles
- ✅ Reliable and fast
- ✅ 100 free queries/day
- ✅ Only $0.005 per query after that

Much better than scraping, session cookies, or any other workaround!
