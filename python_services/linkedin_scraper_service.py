#!/usr/bin/env python3
"""
LinkedIn Scraper Service
Uses linkedin_scraper library to extract profile data
Exposes a Flask API that the Node.js app can call
"""

import asyncio
import json
import os
import sys
import time
from typing import Optional, Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

# Try importing linkedin_scraper components
try:
    from linkedin_scraper import (
        BrowserManager,
        PersonScraper,
        CompanyScraper,
        wait_for_manual_login,
        login_with_credentials,
        ConsoleCallback
    )
    SCRAPER_AVAILABLE = True
except ImportError:
    print("⚠️  linkedin_scraper not installed. Run: pip install linkedin-scraper")
    SCRAPER_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js app

# Session file path
SESSION_FILE = os.path.join(os.path.dirname(__file__), "linkedin_session.json")


class LinkedInScraperService:
    """Service to manage LinkedIn scraping operations"""
    
    def __init__(self):
        self.browser_manager = None
        self.is_authenticated = os.path.exists(SESSION_FILE)
        
        # Rate limiting: Track last request time per profile
        self.last_request_times: Dict[str, float] = {}
        self.min_delay_seconds = 30  # Minimum 30 seconds between same profile requests
        
        # Caching: Store scraped profiles for 1 hour
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_seconds = 3600  # 1 hour
        
        # Global rate limiting: Max requests per minute
        self.request_times: list = []
        self.max_requests_per_minute = 2  # Only 2 LinkedIn requests per minute
    
    def _check_rate_limit(self, profile_key: str) -> tuple[bool, Optional[str]]:
        """Check if request is rate limited"""
        now = time.time()
        
        # Check per-profile rate limit
        if profile_key in self.last_request_times:
            time_since_last = now - self.last_request_times[profile_key]
            if time_since_last < self.min_delay_seconds:
                wait_time = int(self.min_delay_seconds - time_since_last)
                return False, f"Rate limited. Please wait {wait_time} seconds before requesting this profile again."
        
        # Check global rate limit (requests per minute)
        one_minute_ago = now - 60
        self.request_times = [t for t in self.request_times if t > one_minute_ago]
        
        if len(self.request_times) >= self.max_requests_per_minute:
            return False, f"Rate limited. Maximum {self.max_requests_per_minute} LinkedIn requests per minute. Please wait."
        
        return True, None
    
    def _update_rate_limit(self, profile_key: str):
        """Update rate limit trackers"""
        now = time.time()
        self.last_request_times[profile_key] = now
        self.request_times.append(now)
    
    def _get_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached result if not expired"""
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            cached_time = cached_data.get('cached_at', 0)
            
            if time.time() - cached_time < self.cache_ttl_seconds:
                print(f"[CACHE HIT] Returning cached data for {cache_key}")
                return cached_data.get('data')
            else:
                # Cache expired
                del self.cache[cache_key]
        
        return None
    
    def _set_cache(self, cache_key: str, data: Dict[str, Any]):
        """Store result in cache"""
        self.cache[cache_key] = {
            'data': data,
            'cached_at': time.time()
        }
        print(f"[CACHE SET] Cached data for {cache_key}")
    
    async def ensure_authenticated(self) -> bool:
        """Check if we have a valid session"""
        return os.path.exists(SESSION_FILE)
    
    async def create_session_interactive(self) -> Dict[str, Any]:
        """Create a new session by prompting user to log in manually"""
        try:
            async with BrowserManager(headless=False) as browser:
                await browser.page.goto("https://www.linkedin.com/login")
                
                print("=" * 60)
                print("🔐 LINKEDIN LOGIN REQUIRED")
                print("=" * 60)
                print("Please log in to LinkedIn in the browser window...")
                print("The session will be saved for future use.")
                print("=" * 60)
                
                # Wait for manual login (5 minutes timeout)
                await wait_for_manual_login(browser.page, timeout=300)
                
                # Save session
                await browser.save_session(SESSION_FILE)
                
                print("✅ Session saved successfully!")
                self.is_authenticated = True
                
                return {"success": True, "message": "Session created successfully"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def scrape_person(self, linkedin_url: str) -> Dict[str, Any]:
        """Scrape a person's LinkedIn profile"""
        try:
            if not await self.ensure_authenticated():
                return {
                    "success": False,
                    "error": "Not authenticated. Please create a session first.",
                    "needs_auth": True
                }
            
            # Generate cache key
            cache_key = f"person:{linkedin_url}"
            
            # Check cache first
            cached_result = self._get_cache(cache_key)
            if cached_result:
                return {
                    "success": True,
                    "data": cached_result,
                    "cached": True
                }
            
            # Check rate limit
            allowed, error_msg = self._check_rate_limit(cache_key)
            if not allowed:
                return {
                    "success": False,
                    "error": error_msg,
                    "rate_limited": True
                }
            
            # Update rate limit tracker
            self._update_rate_limit(cache_key)
            
            async with BrowserManager(headless=True) as browser:
                # Load saved session
                await browser.load_session(SESSION_FILE)
                
                # Create scraper with progress callback
                callback = ConsoleCallback()
                scraper = PersonScraper(browser.page, callback=callback)
                
                # Scrape profile
                print(f"🔍 Scraping profile: {linkedin_url}")
                person = await scraper.scrape(linkedin_url)
                
                # Convert to dict
                person_data = {
                    "name": person.name,
                    "headline": person.headline,
                    "location": person.location,
                    "about": person.about,
                    "linkedin_url": person.linkedin_url,
                    "experiences": [
                        {
                            "title": exp.title,
                            "company": exp.company,
                            "location": exp.location,
                            "description": exp.description,
                            "start_date": exp.start_date,
                            "end_date": exp.end_date,
                            "duration": exp.duration
                        }
                        for exp in (person.experiences or [])
                    ],
                    "educations": [
                        {
                            "school": edu.school,
                            "degree": edu.degree,
                            "field_of_study": edu.field_of_study,
                            "start_date": edu.start_date,
                            "end_date": edu.end_date
                        }
                        for edu in (person.educations or [])
                    ],
                    "skills": person.skills or [],
                    "accomplishments": person.accomplishments.dict() if person.accomplishments else None
                }
                
                # Cache the result
                self._set_cache(cache_key, person_data)
                
                result = {
                    "success": True,
                    "data": person_data,
                    "cached": False
                }
                
                print(f"✅ Successfully scraped: {person.name}")
                return result
                
        except Exception as e:
            print(f"❌ Error scraping profile: {str(e)}")
            
            # If rate limited, add to rate limit tracker to prevent immediate retries
            if "rate limit" in str(e).lower():
                self._update_rate_limit(f"person:{linkedin_url}")
            
            return {
                "success": False,
                "error": str(e)
            }
    
    async def scrape_company(self, linkedin_url: str) -> Dict[str, Any]:
        """Scrape a company's LinkedIn page"""
        try:
            if not await self.ensure_authenticated():
                return {
                    "success": False,
                    "error": "Not authenticated. Please create a session first.",
                    "needs_auth": True
                }
            
            # Generate cache key
            cache_key = f"company:{linkedin_url}"
            
            # Check cache first
            cached_result = self._get_cache(cache_key)
            if cached_result:
                return {
                    "success": True,
                    "data": cached_result,
                    "cached": True
                }
            
            # Check rate limit
            allowed, error_msg = self._check_rate_limit(cache_key)
            if not allowed:
                return {
                    "success": False,
                    "error": error_msg,
                    "rate_limited": True
                }
            
            # Update rate limit tracker
            self._update_rate_limit(cache_key)
            
            async with BrowserManager(headless=True) as browser:
                await browser.load_session(SESSION_FILE)
                
                callback = ConsoleCallback()
                scraper = CompanyScraper(browser.page, callback=callback)
                
                print(f"🏢 Scraping company: {linkedin_url}")
                company = await scraper.scrape(linkedin_url)
                
                company_data = {
                    "name": company.name,
                    "industry": company.industry,
                    "company_size": company.company_size,
                    "headquarters": company.headquarters,
                    "founded": company.founded,
                    "specialties": company.specialties or [],
                    "about": company.about_us,
                    "linkedin_url": company.linkedin_url
                }
                
                # Cache the result
                self._set_cache(cache_key, company_data)
                
                result = {
                    "success": True,
                    "data": company_data,
                    "cached": False
                }
                
                print(f"✅ Successfully scraped: {company.name}")
                return result
                
        except Exception as e:
            print(f"❌ Error scraping company: {str(e)}")
            
            # If rate limited, add to rate limit tracker
            if "rate limit" in str(e).lower():
                self._update_rate_limit(f"company:{linkedin_url}")
            
            return {
                "success": False,
                "error": str(e)
            }


# Initialize service
scraper_service = LinkedInScraperService()


# API Routes
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "scraper_available": SCRAPER_AVAILABLE,
        "authenticated": scraper_service.is_authenticated,
        "session_file_exists": os.path.exists(SESSION_FILE)
    })


@app.route('/auth/status', methods=['GET'])
def auth_status():
    """Check authentication status"""
    return jsonify({
        "authenticated": scraper_service.is_authenticated,
        "session_file": SESSION_FILE,
        "session_exists": os.path.exists(SESSION_FILE)
    })


@app.route('/auth/create-session', methods=['POST'])
def create_session():
    """Create a new LinkedIn session (interactive login)"""
    if not SCRAPER_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "linkedin_scraper not installed"
        }), 500
    
    # Run async function
    result = asyncio.run(scraper_service.create_session_interactive())
    
    if result["success"]:
        return jsonify(result), 200
    else:
        return jsonify(result), 400


@app.route('/scrape/person', methods=['POST'])
def scrape_person():
    """Scrape a person's LinkedIn profile"""
    if not SCRAPER_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "linkedin_scraper not installed"
        }), 500
    
    data = request.get_json()
    linkedin_url = data.get('url') or data.get('linkedin_url')
    
    if not linkedin_url:
        return jsonify({
            "success": False,
            "error": "Missing 'url' or 'linkedin_url' parameter"
        }), 400
    
    # Normalize URL
    if not linkedin_url.startswith('http'):
        if linkedin_url.startswith('/in/'):
            linkedin_url = f"https://www.linkedin.com{linkedin_url}"
        else:
            linkedin_url = f"https://www.linkedin.com/in/{linkedin_url.replace('@', '')}"
    
    # Run async scraping
    result = asyncio.run(scraper_service.scrape_person(linkedin_url))
    
    if result["success"]:
        return jsonify(result), 200
    else:
        status_code = 401 if result.get("needs_auth") else 500
        return jsonify(result), status_code


@app.route('/scrape/company', methods=['POST'])
def scrape_company():
    """Scrape a company's LinkedIn page"""
    if not SCRAPER_AVAILABLE:
        return jsonify({
            "success": False,
            "error": "linkedin_scraper not installed"
        }), 500
    
    data = request.get_json()
    linkedin_url = data.get('url') or data.get('linkedin_url')
    
    if not linkedin_url:
        return jsonify({
            "success": False,
            "error": "Missing 'url' or 'linkedin_url' parameter"
        }), 400
    
    # Normalize URL
    if not linkedin_url.startswith('http'):
        if linkedin_url.startswith('/company/'):
            linkedin_url = f"https://www.linkedin.com{linkedin_url}"
        else:
            linkedin_url = f"https://www.linkedin.com/company/{linkedin_url}"
    
    # Run async scraping
    result = asyncio.run(scraper_service.scrape_company(linkedin_url))
    
    if result["success"]:
        return jsonify(result), 200
    else:
        status_code = 401 if result.get("needs_auth") else 500
        return jsonify(result), status_code


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 LinkedIn Scraper Service")
    print("=" * 60)
    print(f"Scraper Available: {SCRAPER_AVAILABLE}")
    print(f"Session File: {SESSION_FILE}")
    print(f"Authenticated: {scraper_service.is_authenticated}")
    print("=" * 60)
    
    if not SCRAPER_AVAILABLE:
        print("⚠️  Please install dependencies:")
        print("   pip install linkedin-scraper flask flask-cors")
        print("   playwright install chromium")
        sys.exit(1)
    
    if not scraper_service.is_authenticated:
        print("⚠️  No session found. Please create one first:")
        print("   python linkedin_scraper_service.py --create-session")
        print("")
        print("Or use the API endpoint:")
        print("   POST http://localhost:5001/auth/create-session")
        print("")
    
    # Check for command line args
    if len(sys.argv) > 1 and sys.argv[1] == '--create-session':
        print("Creating session...")
        result = asyncio.run(scraper_service.create_session_interactive())
        if result["success"]:
            print("✅ Session created! You can now start the server.")
        else:
            print(f"❌ Failed: {result.get('error')}")
        sys.exit(0)
    
    # Start Flask server
    print("Starting server on http://localhost:5001")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)
