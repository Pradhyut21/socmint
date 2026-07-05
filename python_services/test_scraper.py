#!/usr/bin/env python3
"""
Test script to verify LinkedIn scraper works
"""
import asyncio
import sys
import os

try:
    from linkedin_scraper import BrowserManager, PersonScraper, ConsoleCallback
except ImportError:
    print("❌ linkedin_scraper not installed!")
    sys.exit(1)

SESSION_FILE = "linkedin_session.json"

async def test_scraper():
    """Test the scraper with a known profile"""
    
    # Check if session exists
    if not os.path.exists(SESSION_FILE):
        print("❌ No session file found!")
        print(f"   Expected: {SESSION_FILE}")
        print("")
        print("Please create a session first:")
        print("  python create_session.py")
        return False
    
    print("=" * 70)
    print("🧪 TESTING LINKEDIN SCRAPER")
    print("=" * 70)
    print("")
    
    try:
        # Test with Bill Gates' profile (public and well-known)
        test_url = "https://www.linkedin.com/in/williamhgates/"
        
        print(f"📂 Loading session from: {SESSION_FILE}")
        print(f"🎯 Test target: {test_url}")
        print("")
        
        async with BrowserManager(headless=True) as browser:
            # Load session
            await browser.load_session(SESSION_FILE)
            print("✅ Session loaded")
            
            # Create scraper with console callback
            callback = ConsoleCallback()
            scraper = PersonScraper(browser.page, callback=callback)
            
            print("")
            print("🔍 Scraping profile...")
            print("-" * 70)
            
            # Scrape profile
            person = await scraper.scrape(test_url)
            
            print("-" * 70)
            print("")
            print("=" * 70)
            print("✅ SCRAPING SUCCESSFUL!")
            print("=" * 70)
            print("")
            print(f"Name:       {person.name}")
            print(f"Headline:   {person.headline}")
            print(f"Location:   {person.location}")
            print(f"About:      {person.about[:100] if person.about else 'N/A'}...")
            print(f"Experiences: {len(person.experiences or [])} entries")
            print(f"Education:   {len(person.educations or [])} entries")
            print(f"Skills:      {len(person.skills or [])} skills")
            print("")
            
            if person.experiences:
                print("Recent Experience:")
                exp = person.experiences[0]
                print(f"  • {exp.title or 'N/A'} at {exp.company or 'N/A'}")
                if exp.duration:
                    print(f"    Duration: {exp.duration}")
                print("")
            
            print("=" * 70)
            print("🎉 TEST PASSED - Scraper is working!")
            print("=" * 70)
            print("")
            print("You can now start the service:")
            print("  python linkedin_scraper_service.py")
            print("")
            
            return True
            
    except Exception as e:
        print("")
        print("=" * 70)
        print(f"❌ TEST FAILED: {str(e)}")
        print("=" * 70)
        print("")
        
        # Check if it's an authentication error
        if "login" in str(e).lower() or "auth" in str(e).lower():
            print("💡 This looks like an authentication error.")
            print("   Your session may have expired.")
            print("")
            print("Try creating a fresh session:")
            print("  python create_session.py")
        
        return False

if __name__ == "__main__":
    success = asyncio.run(test_scraper())
    sys.exit(0 if success else 1)
