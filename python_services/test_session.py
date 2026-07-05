#!/usr/bin/env python3
"""
Test if the LinkedIn session is still valid
"""

import asyncio
import os
from linkedin_scraper import BrowserManager

SESSION_FILE = os.path.join(os.path.dirname(__file__), "linkedin_session.json")

async def test_session():
    """Test if the saved session is still valid"""
    
    if not os.path.exists(SESSION_FILE):
        print("❌ Session file not found!")
        return False
    
    print(f"✅ Session file exists: {SESSION_FILE}")
    
    try:
        async with BrowserManager(headless=False) as browser:
            print("🌐 Loading session...")
            await browser.load_session(SESSION_FILE)
            
            print("📄 Navigating to LinkedIn feed...")
            await browser.page.goto("https://www.linkedin.com/feed/")
            
            # Wait a bit for page to load
            await asyncio.sleep(3)
            
            # Check current URL
            current_url = browser.page.url
            print(f"Current URL: {current_url}")
            
            # Check if we're still logged in
            if "login" in current_url.lower() or "checkpoint" in current_url.lower():
                print("❌ Session expired! You're being redirected to login.")
                return False
            
            # Try to find a logged-in indicator
            try:
                # Wait for the main feed to load
                await browser.page.wait_for_selector("main", timeout=5000)
                print("✅ Session is valid! Main feed loaded successfully.")
                
                # Get page title
                title = await browser.page.title()
                print(f"Page title: {title}")
                
                return True
            except Exception as e:
                print(f"⚠️ Could not verify login status: {e}")
                print("This might mean the session is expired or LinkedIn is blocking.")
                return False
                
    except Exception as e:
        print(f"❌ Error testing session: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_session())
    
    if result:
        print("\n✅ Session is valid! You can use the scraper.")
    else:
        print("\n❌ Session is invalid. Please create a new session:")
        print("   python create_session_manual.py")
