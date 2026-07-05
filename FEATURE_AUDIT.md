# SOCMINT App - Feature Audit

## API Endpoints Found

### Core Investigation
1. `/api/investigate` - Main investigation endpoint
2. `/api/investigate-live` - Live investigation updates
3. `/api/investigate/bulk` - Bulk investigations
4. `/api/linked-accounts-stream` - Stream account discovery

### OSINT Tools
5. `/api/fast-osint` - Fast username search (20+ platforms)
6. `/api/fast-osint-test` - Test endpoint
7. `/api/osint` - CLI tool integration (holehe, etc.)
8. `/api/sherlock` - Sherlock/Maigret integration
9. `/api/sherlock-test` - Test endpoint
10. `/api/rich-scraper` - Profile scraping tools

### Analysis Features
11. `/api/content-risk` - Content risk analysis
12. `/api/stylometry` - Writing style analysis
13. `/api/domain-search` - Domain/IP investigation
14. `/api/search-intel` - Intelligence search
15. `/api/nexus` - AI geolocation/analysis
16. `/api/chat` - AI chat assistant

### Case Management
17. `/api/evidence` - Evidence management
18. `/api/toolkit` - Investigative toolkit

## Pages Found

1. `/` - Home/Investigation page
2. `/auth` - Authentication
3. `/cases` - Case management
4. `/alerts` - Alerts dashboard
5. `/compliance` - Compliance tracking
6. `/toolkit` - Investigation toolkit

## Testing Each Feature

### ✅ Working Features (Confirmed)
- Fast OSINT username search (20+ platforms)
- GitHub profile scraping (with token)
- Instagram, Reddit, Twitter basic checks
- Profile picture extraction
- Sherlock deep scan integration

### ❓ Features to Test

#### High Priority (User-Facing)
- [ ] Content Risk Analysis
- [ ] Stylometry Analysis
- [ ] Domain/IP Search
- [ ] AI Chat Assistant
- [ ] Evidence Management
- [ ] Case Management
- [ ] Alerts System
- [ ] Compliance Tracking
- [ ] Toolkit Features

#### Medium Priority (Backend)
- [ ] Nexus AI Geolocation
- [ ] Search Intel
- [ ] Rich Scraper
- [ ] Bulk Investigation
- [ ] Live Investigation Stream

#### Low Priority (Optional Tools)
- [ ] OSINT CLI tool integration
- [ ] Sherlock installation

## Features That Need API Keys

Based on code review:

1. **NVIDIA NIM API** (`NVIDIA_API_KEY`)
   - Required for: Nexus geolocation, AI chat
   - Status: ❌ Not configured

2. **News API** (`NEWSAPI_KEY`)
   - Required for: News mentions search
   - Status: ❌ Not configured

3. **HIBP API** (`HIBP_API_KEY`)
   - Required for: Breach data
   - Status: ❌ Not configured

4. **Reddit API** (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`)
   - Required for: Enhanced Reddit data
   - Status: ❌ Not configured

5. **GitHub Token** (`GITHUB_TOKEN`)
   - Required for: GitHub API (higher rate limits)
   - Status: ✅ Configured

6. **Supabase** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Required for: Database storage
   - Status: ❌ Not configured (using defaults)

## Next Steps

1. Test each feature systematically
2. Identify what's broken vs. just needs API keys
3. Fix broken features
4. Document which features require setup
5. Remove or disable fake/non-functional features
