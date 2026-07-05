# LinkedIn Scraper Setup Guide

This guide will help you set up automated LinkedIn scraping using the `linkedin_scraper` Python library.

## Overview

The setup uses a **Python microservice** that runs separately from your Node.js app:
- **Python Service**: Handles LinkedIn scraping using Playwright
- **Node.js Client**: Calls the Python service via HTTP API
- **Session Management**: Login once, reuse session for future scrapes
- **Rate Limiting**: Built-in protection against LinkedIn blocking (see [LINKEDIN_RATE_LIMITING.md](./LINKEDIN_RATE_LIMITING.md))

---

## Step 1: Install Python Dependencies

### Navigate to python_services folder:
```bash
cd python_services
```

### Install required packages:
```bash
pip install -r requirements.txt
```

This will install:
- `linkedin-scraper` - The scraping library
- `flask` - Web framework for the API
- `flask-cors` - CORS support
- `playwright` - Browser automation
- `pydantic` - Data validation
- `aiofiles` - Async file operations

### Install Playwright browsers:
```bash
playwright install chromium
```

---

## Step 2: Create LinkedIn Session

You need to log in to LinkedIn once to create a session file.

### Option A: Interactive Login (Recommended)

Run the session creator script:
```bash
python linkedin_scraper_service.py --create-session
```

This will:
1. Open a browser window
2. Navigate to LinkedIn login page
3. Wait for you to log in manually
4. Save the session to `linkedin_session.json`

**Complete the login within 5 minutes!**

### Option B: Use the API Endpoint

Start the service first:
```bash
python linkedin_scraper_service.py
```

Then make a POST request:
```bash
curl -X POST http://localhost:5001/auth/create-session
```

---

## Step 3: Start the Python Service

Once you have a session file, start the scraper service:

```bash
python linkedin_scraper_service.py
```

You should see:
```
🚀 LinkedIn Scraper Service
====================================
Scraper Available: True
Session File: linkedin_session.json
Authenticated: True
====================================
Starting server on http://localhost:5001
```

**Keep this running in a separate terminal!**

---

## Step 4: Configure Your Node.js App

The Node.js app will automatically connect to the Python service.

### Environment Variable (Optional):

Add to `.env.local` if using a different port:
```env
LINKEDIN_SCRAPER_URL=http://localhost:5001
```

---

## Usage Examples

### Test the Service (Python)

```bash
# Health check
curl http://localhost:5001/health

# Check auth status
curl http://localhost:5001/auth/status

# Scrape a person
curl -X POST http://localhost:5001/scrape/person \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/in/williamhgates/"}'

# Scrape a company
curl -X POST http://localhost:5001/scrape/company \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.linkedin.com/company/microsoft/"}'
```

### Use in Node.js/TypeScript

```typescript
import { 
  scrapeLinkedInPerson, 
  checkScraperHealth 
} from '@/lib/fetchers/linkedinScraperClient';

// Check if service is available
const health = await checkScraperHealth();
if (health?.authenticated) {
  console.log('✅ LinkedIn scraper ready!');
}

// Scrape a profile
const result = await scrapeLinkedInPerson('williamhgates');
if (result.success) {
  console.log('Name:', result.data?.name);
  console.log('Headline:', result.data?.headline);
  console.log('Experiences:', result.data?.experiences);
}
```

---

## API Endpoints

### Health Check
```
GET /health
Response: {
  "status": "healthy",
  "scraper_available": true,
  "authenticated": true,
  "session_file_exists": true
}
```

### Authentication Status
```
GET /auth/status
Response: {
  "authenticated": true,
  "session_file": "linkedin_session.json",
  "session_exists": true
}
```

### Create Session
```
POST /auth/create-session
Response: {
  "success": true,
  "message": "Session created successfully"
}
```

### Scrape Person
```
POST /scrape/person
Body: {
  "url": "https://www.linkedin.com/in/username/" 
}
Response: {
  "success": true,
  "data": {
    "name": "John Doe",
    "headline": "Software Engineer at Tech Co",
    "location": "San Francisco, CA",
    "about": "...",
    "experiences": [...],
    "educations": [...],
    "skills": [...]
  }
}
```

### Scrape Company
```
POST /scrape/company
Body: {
  "url": "https://www.linkedin.com/company/microsoft/"
}
Response: {
  "success": true,
  "data": {
    "name": "Microsoft",
    "industry": "Software Development",
    "company_size": "10,001+ employees",
    "headquarters": "Redmond, WA",
    "about": "..."
  }
}
```

---

## Data You'll Get

### Person Profile:
- ✅ Full name
- ✅ Headline (job title/tagline)
- ✅ Location
- ✅ About/Summary section
- ✅ Work Experience (company, title, dates, description)
- ✅ Education (school, degree, field of study, dates)
- ✅ Skills list
- ✅ Accomplishments
- ✅ Profile URL

### Company Page:
- ✅ Company name
- ✅ Industry
- ✅ Company size
- ✅ Headquarters location
- ✅ Founded year
- ✅ Specialties
- ✅ About/Description
- ✅ Company URL

---

## Troubleshooting

### "Service not available" Error

**Problem**: Python service isn't running

**Solution**:
```bash
cd python_services
python linkedin_scraper_service.py
```

### "Not authenticated" Error

**Problem**: No session file or session expired

**Solution**:
```bash
python linkedin_scraper_service.py --create-session
```

### "Rate Limited" Error

**Problem**: LinkedIn detected too many requests

**Solutions**:
- Add delays between requests (2-5 seconds)
- Use less frequently
- Wait 15-30 minutes before trying again

### Session Expired

**Problem**: Session file exists but no longer valid

**Solution**: Delete session file and create new one
```bash
rm linkedin_session.json
python linkedin_scraper_service.py --create-session
```

### Playwright Installation Issues

**Problem**: Chromium browser not installed

**Solution**:
```bash
playwright install chromium
```

---

## Running in Production

### Keep Service Running (Linux/Mac)

Use `screen` or `tmux`:
```bash
screen -S linkedin-scraper
cd python_services
python linkedin_scraper_service.py
# Press Ctrl+A then D to detach
```

Or use a process manager like `pm2`:
```bash
npm install -g pm2
pm2 start linkedin_scraper_service.py --interpreter python3
pm2 save
pm2 startup
```

### Docker (Advanced)

Create `Dockerfile` in `python_services/`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chromium --with-deps

COPY . .

EXPOSE 5001
CMD ["python", "linkedin_scraper_service.py"]
```

Build and run:
```bash
docker build -t linkedin-scraper .
docker run -p 5001:5001 -v $(pwd)/linkedin_session.json:/app/linkedin_session.json linkedin-scraper
```

---

## Best Practices

1. **Rate Limiting**: Add 2-5 second delays between scrapes
2. **Session Reuse**: Don't create new sessions frequently
3. **Error Handling**: Always check `success` field in responses
4. **Caching**: Cache results to avoid re-scraping
5. **Monitoring**: Check service health regularly
6. **Backup Sessions**: Keep a copy of `linkedin_session.json`

---

## Security Notes

⚠️ **Important Security Considerations**:

- Session file contains authentication tokens - **keep it secure**
- Don't commit `linkedin_session.json` to git (added to `.gitignore`)
- Use a separate LinkedIn account for scraping (optional but recommended)
- Respect LinkedIn's Terms of Service and rate limits
- Monitor your LinkedIn account for suspicious activity

---

## Legal Disclaimer

This tool is for **educational and research purposes only**. Make sure to:
- Comply with LinkedIn's Terms of Service
- Respect users' privacy
- Use rate limiting to avoid detection
- Only scrape publicly available data
- Not use for spam or unauthorized data collection

**The authors are not responsible for any misuse of this tool.**

---

## Support

If you encounter issues:

1. Check service logs for error messages
2. Verify session file exists and is valid
3. Ensure Python dependencies are installed
4. Check network connectivity
5. Try creating a fresh session

For library-specific issues, refer to:
- [linkedin_scraper GitHub](https://github.com/joeyism/linkedin_scraper)
- [Playwright Documentation](https://playwright.dev/python/)
