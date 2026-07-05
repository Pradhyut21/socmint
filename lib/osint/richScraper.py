#!/usr/bin/env python3
"""
Rich Social Media Scraper Integration
Uses Osintgram, Telepathy, Instaloader, snscrape for detailed profile data
"""

import json
import sys
import subprocess
import tempfile
import os
from typing import Dict, Any, Optional
from datetime import datetime

class RichScraper:
    """Get rich profile data from Instagram, Telegram, Twitter without API limits"""
    
    def __init__(self):
        self.tools_available = self._check_tools()
    
    def _check_tools(self) -> Dict[str, bool]:
        """Check which scraping tools are installed"""
        return {
            'instaloader': self._check_package('instaloader'),
            'snscrape': self._check_package('snscrape'),
            'telepathy': self._check_package('telepathy'),
        }
    
    def _check_package(self, package: str) -> bool:
        """Check if Python package is installed"""
        try:
            __import__(package)
            return True
        except ImportError:
            return False
    
    def scrape_instagram(self, username: str) -> Optional[Dict[str, Any]]:
        """Scrape Instagram profile using Instaloader"""
        if not self.tools_available.get('instaloader'):
            return None
        
        try:
            import instaloader
            
            L = instaloader.Instaloader()
            
            # Get profile
            profile = instaloader.Profile.from_username(L.context, username)
            
            return {
                'platform': 'instagram',
                'username': username,
                'full_name': profile.full_name,
                'biography': profile.biography,
                'followers': profile.followers,
                'following': profile.followees,
                'posts_count': profile.mediacount,
                'is_verified': profile.is_verified,
                'is_private': profile.is_private,
                'profile_pic_url': profile.profile_pic_url,
                'external_url': profile.external_url,
                'is_business': profile.is_business_account,
                'scraped_at': datetime.now().isoformat(),
                'success': True
            }
        except Exception as e:
            return {
                'platform': 'instagram',
                'username': username,
                'success': False,
                'error': str(e)
            }
    
    def scrape_twitter(self, username: str) -> Optional[Dict[str, Any]]:
        """Scrape Twitter profile using snscrape"""
        if not self.tools_available.get('snscrape'):
            return None
        
        try:
            import snscrape.modules.twitter as sntwitter
            
            # Get user info
            user = sntwitter.TwitterUserScraper(username).entity
            
            if user:
                return {
                    'platform': 'twitter',
                    'username': username,
                    'display_name': user.displayname,
                    'description': user.rawDescription,
                    'followers': user.followersCount,
                    'following': user.friendsCount,
                    'tweets_count': user.statusesCount,
                    'verified': user.verified,
                    'profile_image': user.profileImageUrl,
                    'profile_banner': user.profileBannerUrl,
                    'location': user.location,
                    'created': user.created.isoformat() if user.created else None,
                    'url': user.url,
                    'scraped_at': datetime.now().isoformat(),
                    'success': True
                }
            
            return None
        except Exception as e:
            return {
                'platform': 'twitter',
                'username': username,
                'success': False,
                'error': str(e)
            }
    
    def scrape_reddit(self, username: str) -> Optional[Dict[str, Any]]:
        """Scrape Reddit profile using snscrape"""
        if not self.tools_available.get('snscrape'):
            return None
        
        try:
            import snscrape.modules.reddit as snreddit
            
            user = snreddit.RedditUserScraper(username).entity
            
            if user:
                return {
                    'platform': 'reddit',
                    'username': username,
                    'link_karma': user.linkKarma,
                    'comment_karma': user.commentKarma,
                    'is_verified': user.verified,
                    'is_gold': user.isGold,
                    'is_mod': user.isMod,
                    'created': user.created.isoformat() if user.created else None,
                    'scraped_at': datetime.now().isoformat(),
                    'success': True
                }
            
            return None
        except Exception as e:
            return {
                'platform': 'reddit',
                'username': username,
                'success': False,
                'error': str(e)
            }
    
    def scrape_telegram(self, username: str) -> Optional[Dict[str, Any]]:
        """Check Telegram channel/user"""
        # Telegram requires session login, return basic check for now
        return {
            'platform': 'telegram',
            'username': username,
            'url': f'https://t.me/{username}',
            'note': 'Telegram requires authentication for detailed data',
            'success': False
        }
    
    def scrape_all(self, username: str, platforms: list = None) -> Dict[str, Any]:
        """Scrape multiple platforms"""
        if platforms is None:
            platforms = ['instagram', 'twitter', 'reddit']
        
        results = {
            'username': username,
            'platforms_scraped': [],
            'profiles': [],
            'errors': []
        }
        
        if 'instagram' in platforms:
            ig_data = self.scrape_instagram(username)
            if ig_data:
                if ig_data.get('success'):
                    results['platforms_scraped'].append('instagram')
                    results['profiles'].append(ig_data)
                else:
                    results['errors'].append(f"Instagram: {ig_data.get('error', 'Unknown error')}")
        
        if 'twitter' in platforms:
            tw_data = self.scrape_twitter(username)
            if tw_data:
                if tw_data.get('success'):
                    results['platforms_scraped'].append('twitter')
                    results['profiles'].append(tw_data)
                else:
                    results['errors'].append(f"Twitter: {tw_data.get('error', 'Unknown error')}")
        
        if 'reddit' in platforms:
            rd_data = self.scrape_reddit(username)
            if rd_data:
                if rd_data.get('success'):
                    results['platforms_scraped'].append('reddit')
                    results['profiles'].append(rd_data)
                else:
                    results['errors'].append(f"Reddit: {rd_data.get('error', 'Unknown error')}")
        
        if 'telegram' in platforms:
            tg_data = self.scrape_telegram(username)
            if tg_data:
                results['profiles'].append(tg_data)
        
        return results

def install_scrapers() -> Dict[str, Any]:
    """Install scraping tools"""
    results = {}
    
    # Install Instaloader
    try:
        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', 'instaloader'],
            capture_output=True,
            timeout=120
        )
        results['instaloader'] = {'installed': True, 'error': None}
    except Exception as e:
        results['instaloader'] = {'installed': False, 'error': str(e)}
    
    # Install snscrape
    try:
        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', 'snscrape'],
            capture_output=True,
            timeout=120
        )
        results['snscrape'] = {'installed': True, 'error': None}
    except Exception as e:
        results['snscrape'] = {'installed': False, 'error': str(e)}
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: richScraper.py <command> [args]",
            "commands": {
                "check-tools": "Check installed tools",
                "scrape <username> [platforms]": "Scrape profile data",
                "install": "Install scraping tools"
            }
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "check-tools":
        scraper = RichScraper()
        print(json.dumps({
            'success': True,
            'tools': scraper.tools_available
        }, indent=2))
    
    elif command == "scrape" and len(sys.argv) > 2:
        username = sys.argv[2]
        platforms = sys.argv[3].split(',') if len(sys.argv) > 3 else None
        
        scraper = RichScraper()
        result = scraper.scrape_all(username, platforms)
        print(json.dumps(result, indent=2))
    
    elif command == "install":
        result = install_scrapers()
        print(json.dumps(result, indent=2))
    
    else:
        print(json.dumps({'error': 'Invalid command'}))
        sys.exit(1)
