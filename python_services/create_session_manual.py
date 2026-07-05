#!/usr/bin/env python3
"""
Manual LinkedIn session creator with extended timeout
"""
import asyncio
import os
from linkedin_scraper import BrowserManager

SESSION_FILE = "linkedin_session.json"

async def create_session_manual():
    """Create session with manual login - keeps browser open for 10 minutes"""
    print("=" * 70)
    print("🔐 LINKEDIN SESSION CREATOR (MANUAL)")
    print("=" * 70)
    print("")
    print("⏱️  Browser will stay open until you press ENTER in terminal")
    print("")
    print("Steps:")
    print("  1. Browser will open automatically")
    print("  2. Log in to LinkedIn")
    print("  3. After login, come back here and press ENTER")
    print("")
    print("=" * 70)
    print("")
    print("🚀 Starting browser...")
    
    try:
        async with BrowserManager(headless=False, slow_mo=100) as browser:
            print("📂 Opening LinkedIn...")
            await browser.page.goto("https://www.linkedin.com/login", timeout=60000)
            
            print("")
            print("=" * 70)
            print("👉 BROWSER IS NOW OPEN")
            print("=" * 70)
            print("")
            print("Please:")
            print("  1. Complete the LinkedIn login in the browser")
            print("  2. Wait until you see your LinkedIn feed/homepage")
            print("  3. Come back to this terminal and press ENTER")
            print("")
            print("⏱️  Take your time - browser will stay open!")
            print("=" * 70)
            print("")
            
            # Wait for user to press ENTER
            await asyncio.get_event_loop().run_in_executor(None, input, "Press ENTER after you've logged in: ")
            
            print("")
            print("💾 Saving session...")
            await browser.save_session(SESSION_FILE)
            
            print("")
            print("=" * 70)
            print("✅ SESSION SAVED SUCCESSFULLY!")
            print("=" * 70)
            print(f"Session file: {SESSION_FILE}")
            print("")
            print("You can now:")
            print("  1. Test: python test_scraper.py")
            print("  2. Start: python linkedin_scraper_service.py")
            print("=" * 70)
            
    except Exception as e:
        print("")
        print("=" * 70)
        print(f"❌ ERROR: {str(e)}")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(create_session_manual())
