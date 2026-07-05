#!/usr/bin/env python3
"""
Quick script to create LinkedIn session
"""
import asyncio
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from linkedin_scraper import BrowserManager, wait_for_manual_login
except ImportError:
    print("❌ linkedin_scraper not installed!")
    print("Run: python -m pip install linkedin-scraper")
    sys.exit(1)

SESSION_FILE = "linkedin_session.json"

async def create_session():
    """Create a new LinkedIn session with interactive login"""
    print("=" * 70)
    print("🔐 LINKEDIN SESSION CREATOR")
    print("=" * 70)
    print("")
    print("This will:")
    print("  1. Open a browser window")
    print("  2. Navigate to LinkedIn login")
    print("  3. Wait for you to log in")
    print("  4. Save the session for future use")
    print("")
    print("⚠️  You have 5 minutes to complete the login!")
    print("=" * 70)
    print("")
    
    try:
        async with BrowserManager(headless=False, slow_mo=100) as browser:
            # Navigate to LinkedIn login
            print("📂 Opening LinkedIn login page...")
            await browser.page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=60000)
            
            print("")
            print("👉 Please log in to LinkedIn in the browser window...")
            print("   (The browser will close automatically after login)")
            print("")
            
            # Wait for manual login (300 seconds = 5 minutes)
            await wait_for_manual_login(browser.page, timeout=300)
            
            # Save session
            print("")
            print("💾 Saving session...")
            await browser.save_session(SESSION_FILE)
            
            print("")
            print("=" * 70)
            print("✅ SESSION CREATED SUCCESSFULLY!")
            print("=" * 70)
            print(f"Session saved to: {SESSION_FILE}")
            print("")
            print("You can now start the scraper service:")
            print("  python linkedin_scraper_service.py")
            print("=" * 70)
            
            return True
            
    except asyncio.TimeoutError:
        print("")
        print("=" * 70)
        print("❌ TIMEOUT - Login took too long")
        print("=" * 70)
        print("Please try again and complete login within 5 minutes")
        return False
        
    except Exception as e:
        print("")
        print("=" * 70)
        print(f"❌ ERROR: {str(e)}")
        print("=" * 70)
        return False

if __name__ == "__main__":
    # Check if session already exists
    if os.path.exists(SESSION_FILE):
        print("")
        print("⚠️  Session file already exists!")
        print(f"   {SESSION_FILE}")
        print("")
        response = input("Do you want to create a new session? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Cancelled.")
            sys.exit(0)
        print("")
    
    # Run async session creation
    success = asyncio.run(create_session())
    sys.exit(0 if success else 1)
