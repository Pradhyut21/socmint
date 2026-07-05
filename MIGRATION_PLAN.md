# Migration Plan: Apply Platform Improvements to feature-ai Branch

## Current Status

### What's Already Done in feature-ai:
✅ Instagram - Has API support with fallback
✅ Medium - Has RSS feed parsing
✅ TikTok - Has oEmbed support  
✅ Reddit - Has JSON API
✅ LinkedIn - Has meta extraction
✅ YouTube - Has meta extraction
✅ Pinterest - Has meta extraction
✅ Search engine fallbacks for blocked platforms

### What's Missing (from our improvements):
The `feature-ai` branch has:
- **Better architecture** (fetchers separated into modules)
- **More platforms** (20 platforms vs our 30)
- **Advanced fallback strategies** (search engine verification, Wayback Machine)

However, it's missing these platforms we improved:
- Chess.com (API)
- LeetCode (GraphQL API)
- Freelancer (API)
- Duolingo (API)
- Stack Overflow (Stack Exchange API)
- Threads (HTML probe)
- Keybase (API)
- SoundCloud (enhanced HTML)
- Dribbble (enhanced HTML)
- CodePen (enhanced HTML)
- Behance (enhanced HTML)
- Steam (enhanced HTML)
- Telegram (enhanced HTML)
- Kaggle, Academia, Picsart, Smule, Quizlet

## Files to Modify

### Main File:
`lib/fetchers/social.ts` - Contains all platform logic

### Platform List (Line ~22):
Current platforms in feature-ai:
1. github ✅
2. reddit ✅
3. hackernews ✅
4. devto ✅
5. gitlab ✅
6. tumblr ✅
7. twitter ✅
8. instagram ✅
9. facebook ✅
10. telegram ✅
11. linkedin ✅
12. tiktok ✅
13. snapchat
14. pinterest ✅
15. soundcloud
16. medium ✅
17. quora
18. steam
19. pastebin
20. youtube ✅

**Add these platforms:**
21. chess (Chess.com)
22. leetcode (LeetCode)
23. freelancer (Freelancer.com)
24. duolingo (Duolingo)
25. stackoverflow (Stack Overflow)
26. threads (Threads)
27. keybase (Keybase)
28. dribbble (Dribbble)
29. codepen (CodePen)
30. behance (Behance)

## Implementation Steps

### Step 1: Add Platform Definitions
Add to `PLATFORM_PROBES` array (line 22):

```typescript
{ tier: 1, platform: "chess", label: "Chess.com", url: (u) => `https://www.chess.com/member/${u}` },
{ tier: 1, platform: "leetcode", label: "LeetCode", url: (u) => `https://leetcode.com/u/${u}` },
{ tier: 1, platform: "stackoverflow", label: "Stack Overflow", url: (u) => `https://stackoverflow.com/users/${u}` },
{ tier: 1, platform: "freelancer", label: "Freelancer", url: (u) => `https://www.freelancer.com/u/${u}` },
{ tier: 1, platform: "duolingo", label: "Duolingo", url: (u) => `https://www.duolingo.com/profile/${u}` },
{ tier: 1, platform: "keybase", label: "Keybase", url: (u) => `https://keybase.io/${u}` },
{ tier: 2, platform: "threads", label: "Threads", url: (u) => `https://www.threads.net/@${u}` },
{ tier: 2, platform: "dribbble", label: "Dribbble", url: (u) => `https://dribbble.com/${u}` },
{ tier: 2, platform: "codepen", label: "CodePen", url: (u) => `https://codepen.io/${u}` },
{ tier: 2, platform: "behance", label: "Behance", url: (u) => `https://www.behance.net/${u}` },
```

### Step 2: Add API Probes
Add before the main HTML probe (around line 650):

```typescript
// Chess.com API
if (lowercaseUrl.includes("chess.com/member/")) {
  // [Copy Chess.com API logic from our improvements]
}

// LeetCode GraphQL API
if (lowercaseUrl.includes("leetcode.com")) {
  // [Copy LeetCode GraphQL logic from our improvements]
}

// Stack Overflow API
if (lowercaseUrl.includes("stackoverflow.com/users")) {
  // [Copy Stack Overflow API logic from our improvements]
}

// Freelancer API
if (lowercaseUrl.includes("freelancer.com/u/")) {
  // [Copy Freelancer API logic from our improvements]
}

// Duolingo API
if (lowercaseUrl.includes("duolingo.com/profile/")) {
  // [Copy Duolingo API logic from our improvements]
}

// Keybase API
if (lowercaseUrl.includes("keybase.io/")) {
  // [Copy Keybase API logic from our improvements]
}

// Threads HTML probe
if (lowercaseUrl.includes("threads.net")) {
  // [Copy Threads logic from our improvements]
}
```

### Step 3: Enhance Existing Probes
Enhance these existing platforms with better data extraction:

```typescript
// SoundCloud - add follower/track extraction
if (lowercaseUrl.includes("soundcloud.com")) {
  // [Add enhanced parsing]
}

// Dribbble - add shot/follower extraction
if (lowercaseUrl.includes("dribbble.com")) {
  // [Add enhanced parsing]
}

// CodePen - add pen/follower extraction
if (lowercaseUrl.includes("codepen.io")) {
  // [Add enhanced parsing]
}

// Behance - add project/follower extraction
if (lowercaseUrl.includes("behance.net")) {
  // [Add enhanced parsing]
}

// Steam - add better meta extraction
if (lowercaseUrl.includes("steamcommunity.com")) {
  // [Add enhanced parsing]
}

// Telegram - add subscriber extraction
if (lowercaseUrl.includes("t.me/")) {
  // [Add enhanced parsing]
}
```

## Decision: Keep feature-ai Architecture

The `feature-ai` branch has a **superior architecture**:

1. **Modular structure** - Fetchers separated by type (social, court, financial, leaks)
2. **Advanced fallbacks** - Search engine verification, Wayback Machine
3. **Better error handling** - More robust retry logic
4. **Enhanced metadata** - LinkedIn, Instagram, YouTube, Pinterest specific metadata
5. **Integration ready** - Already integrated with other analysis modules

**Recommendation:**
Instead of replacing the entire file, **add the missing platform probes** to the existing structure.

## Estimated Effort

- **Time**: 2-3 hours
- **Changes**: ~500-800 lines of new code
- **Testing**: Test each new platform individually

## Priority Order

### High Priority (Core APIs):
1. Chess.com ⭐⭐⭐⭐⭐
2. LeetCode ⭐⭐⭐⭐⭐
3. Stack Overflow ⭐⭐⭐⭐⭐
4. Threads ⭐⭐⭐⭐

### Medium Priority (Good APIs):
5. Duolingo ⭐⭐⭐⭐
6. Freelancer ⭐⭐⭐⭐
7. Keybase ⭐⭐⭐⭐

### Low Priority (HTML Enhancements):
8. SoundCloud ⭐⭐⭐
9. Dribbble ⭐⭐⭐
10. CodePen ⭐⭐⭐
11. Behance ⭐⭐⭐
12. Enhanced Telegram ⭐⭐

## Next Steps

1. ✅ You're on the `feature-ai` branch
2. ⏳ Add platform definitions to `PLATFORM_PROBES`
3. ⏳ Add API probes for high-priority platforms
4. ⏳ Test each platform individually
5. ⏳ Commit and push to feature-ai
6. ⏳ Create PR to merge into main

## Summary

**The feature-ai branch is better architected than what we had before.**

Instead of copying our improvements wholesale, we should:
1. Keep the feature-ai architecture
2. Add the 10-15 missing platforms we improved
3. Enhance existing platforms with better data extraction
4. Maintain the advanced fallback mechanisms

This gives you the best of both worlds:
- ✅ Better code structure (feature-ai)
- ✅ More platforms (our improvements)
- ✅ Advanced features (search engine fallbacks, Wayback Machine)
- ✅ No authentication required (safe approach)

**Would you like me to proceed with adding the missing platforms to this feature-ai branch?**
