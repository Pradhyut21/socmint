# LinkedIn Scraper Python Service

Python microservice for scraping LinkedIn profiles and companies.

## Quick Start

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
python -m playwright install chromium
```

### 2. Create LinkedIn Session
```bash
python create_session.py
```
This will:
- Open a browser
- Navigate to LinkedIn login
- Wait for you to log in (5 minutes)
- Save session to `linkedin_session.json`

### 3. Test the Scraper
```bash
python test_scraper.py
```
This will scrape a test profile to verify everything works.

### 4. Start the Service
```bash
python linkedin_scraper_service.py
```
Service runs on: `http://localhost:5001`

## Available Scripts

### `create_session.py`
Interactive session creator. Opens a browser for you to log in to LinkedIn.

```bash
python create_session.py
```

### `test_scraper.py`
Tests the scraper with Bill Gates' profile (public profile).

```bash
python test_scraper.py
```

### `linkedin_scraper_service.py`
Main Flask API service.

```bash
# Start service
python linkedin_scraper_service.py

# Or create session from command line
python linkedin_scraper_service.py --create-session
```

## API Endpoints

### Health Check
```bash
curl http://localhost:5001/health
```

### Scrape Person
```bash
curl -X POST http://localhost:5001/scrape/person \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/in/williamhgates/"}'
```

### Scrape Company
```bash
curl -X POST http://localhost:5001/scrape/company \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/company/microsoft/"}'
```

### Check Auth Status
```bash
curl http://localhost:5001/auth/status
```

## Troubleshooting

### "linkedin_scraper not installed"
```bash
python -m pip install linkedin-scraper
```

### "Playwright browsers not installed"
```bash
python -m playwright install chromium
```

### "Not authenticated"
```bash
python create_session.py
```

### Session expired
Delete `linkedin_session.json` and create a new one:
```bash
del linkedin_session.json  # Windows
rm linkedin_session.json   # Linux/Mac
python create_session.py
```

## Files

- `linkedin_scraper_service.py` - Main Flask API service
- `create_session.py` - Interactive session creator
- `test_scraper.py` - Test script
- `requirements.txt` - Python dependencies
- `linkedin_session.json` - Saved LinkedIn session (created after login)
- `README.md` - This file

## Security

⚠️ **IMPORTANT**:
- `linkedin_session.json` contains authentication tokens
- Never commit this file to git (it's in `.gitignore`)
- Keep it secure - it gives access to your LinkedIn account
- Session expires after ~1 year or when you log out

## Support

See the main project documentation:
- `LINKEDIN_SCRAPER_SETUP.md` - Complete setup guide
- `LINKEDIN_AUTH_SETUP.md` - Alternative auth method (deprecated)
