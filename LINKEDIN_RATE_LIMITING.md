# LinkedIn Scraper - Rate Limiting & Caching

## Overview
The LinkedIn scraper now includes comprehensive rate limiting and caching to prevent LinkedIn from blocking automated requests.

## Rate Limiting Rules

### Per-Profile Rate Limiting
- **Minimum delay**: 30 seconds between requests for the same profile
- Prevents rapid repeated scraping of the same person/company

### Global Rate Limiting
- **Maximum requests**: 2 LinkedIn requests per minute
- Applies across all profiles
- Prevents overwhelming LinkedIn's servers

## Caching System

### Cache Duration
- **TTL**: 1 hour (3600 seconds)
- Scraped profiles are stored in memory for 1 hour
- Reduces redundant requests for recently scraped profiles

### Cache Behavior
- First request: Scrapes from LinkedIn (cached = false)
- Subsequent requests within 1 hour: Returns cached data (cached = true)
- After 1 hour: Cache expires, new scrape required

## Response Fields

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "cached": false  // or true if from cache
}
```

### Rate Limited Response
```json
{
  "success": false,
  "error": "Rate limited. Please wait X seconds...",
  "rate_limited": true
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "needs_auth": false
}
```

## Implementation Details

### Python Service (`linkedin_scraper_service.py`)
- `_check_rate_limit()`: Checks if request is allowed
- `_update_rate_limit()`: Updates rate limit trackers
- `_get_cache()`: Retrieves cached data if not expired
- `_set_cache()`: Stores scraped data in cache

### Node.js Client (`linkedinScraperClient.ts`)
- Enhanced logging for cache hits and rate limits
- Proper error handling for `rate_limited` and `cached` flags

### Integration (`fastOSINT.ts`)
- `checkLinkedIn()` function handles rate limiting gracefully
- Logs cache status for debugging

## Usage Recommendations

### For Users
1. **Be patient**: LinkedIn scraping is slow by design to avoid detection
2. **Cache-aware**: If you scrape the same profile multiple times, it will use cache
3. **Rate limits**: Wait 30 seconds between scraping the same profile
4. **Global limits**: Maximum 2 profiles per minute

### For Developers
1. **Don't retry immediately**: If rate limited, wait before retrying
2. **Check cached flag**: Use cached data when available
3. **Handle errors**: Check for `rate_limited` flag in responses
4. **Monitor logs**: Watch for rate limit warnings

## Testing

Run the test script:
```bash
node test_linkedin.js
```

Expected behavior:
1. Health check passes
2. First scrape attempts to fetch from LinkedIn
3. Second scrape within 30 seconds is rate limited

## Troubleshooting

### "Rate limited" errors (from our service)
- **Cause**: Too many requests too quickly to our rate limiter
- **Solution**: Wait the specified time before retrying (30 seconds per profile, 2 per minute globally)

### "Rate limit message detected on page" (from LinkedIn)
- **Cause**: LinkedIn has detected automated scraping and is blocking requests
- **Solution**: 
  - Wait several hours before trying again
  - Reduce scraping frequency (only scrape when absolutely necessary)
  - Consider using LinkedIn's official API for production use
  - Session may need to be refreshed: `python test_session.py`

### Profile scraping fails
- **Cause**: Profile doesn't exist, is private, or LinkedIn is showing a CAPTCHA
- **Solution**: 
  - Verify profile URL is correct (try accessing in a browser)
  - Check if profile requires login to view
  - Run `python test_session.py` to verify session validity

### Service not available
- **Cause**: Python service is not running
- **Solution**: Start the service with `python linkedin_scraper_service.py`

### Session expired
- **Cause**: LinkedIn session cookie has expired
- **Solution**: 
  1. Test session: `python test_session.py`
  2. If invalid, create new session: `python create_session_manual.py`

## Session Management

The scraper uses a saved session file (`linkedin_session.json`) to avoid logging in every time:
- **Location**: `python_services/linkedin_session.json`
- **Validity**: Sessions can expire; you may need to re-login
- **Re-login**: Run `python create_session_manual.py` to create a new session

## Future Improvements

Potential enhancements:
1. **Persistent cache**: Store cache in Redis or database
2. **Configurable limits**: Make rate limits adjustable via env vars
3. **Queue system**: Queue requests to automatically handle rate limiting
4. **Session rotation**: Use multiple sessions to increase throughput
5. **Exponential backoff**: Increase delay after rate limit hits
