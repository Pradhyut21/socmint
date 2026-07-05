/**
 * Rich Scraper Integration
 * Uses Instaloader, snscrape for detailed profile data
 * Gets followers, bio, posts, verified status without API limits
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { PlatformAccount } from '../types';

const execFileAsync = promisify(execFile);

export interface RichProfileData {
  platform: string;
  username: string;
  success: boolean;
  // Instagram specific
  full_name?: string;
  biography?: string;
  followers?: number;
  following?: number;
  posts_count?: number;
  is_verified?: boolean;
  is_private?: boolean;
  profile_pic_url?: string;
  external_url?: string;
  is_business?: boolean;
  // Twitter specific
  display_name?: string;
  description?: string;
  tweets_count?: number;
  verified?: boolean;
  profile_image?: string;
  profile_banner?: string;
  location?: string;
  created?: string;
  url?: string;
  // Reddit specific
  link_karma?: number;
  comment_karma?: number;
  is_gold?: boolean;
  is_mod?: boolean;
  // Common
  scraped_at?: string;
  error?: string;
}

export interface RichScraperResult {
  username: string;
  platforms_scraped: string[];
  profiles: RichProfileData[];
  errors: string[];
}

/**
 * Scrape rich profile data using specialized tools
 */
export async function scrapeRichProfiles(
  username: string,
  platforms: string[] = ['instagram', 'twitter', 'reddit'],
  timeout: number = 30000
): Promise<RichScraperResult> {
  try {
    console.log(`[RICH-SCRAPER] Scraping ${platforms.join(', ')} for "${username}"`);
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'richScraper.py');
    
    const { stdout, stderr } = await execFileAsync(
      'python',
      [pythonScript, 'scrape', username, platforms.join(',')],
      {
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB
      }
    );

    if (stderr) {
      console.log('[RICH-SCRAPER] stderr:', stderr);
    }

    const result: RichScraperResult = JSON.parse(stdout);
    
    console.log(`[RICH-SCRAPER] Scraped ${result.platforms_scraped.length} platforms successfully`);
    if (result.errors.length > 0) {
      console.log(`[RICH-SCRAPER] Errors: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error: any) {
    console.error('[RICH-SCRAPER] Failed:', error.message);
    return {
      username,
      platforms_scraped: [],
      profiles: [],
      errors: [error.message]
    };
  }
}

/**
 * Check which scraping tools are installed
 */
export async function checkScraperTools(): Promise<{
  instaloader: boolean;
  snscrape: boolean;
  telepathy: boolean;
}> {
  try {
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'richScraper.py');
    const { stdout } = await execFileAsync('python', [pythonScript, 'check-tools'], {
      timeout: 5000
    });
    
    const result = JSON.parse(stdout);
    return result.tools || { instaloader: false, snscrape: false, telepathy: false };
  } catch (error) {
    console.error('[RICH-SCRAPER] Tool check failed:', error);
    return { instaloader: false, snscrape: false, telepathy: false };
  }
}

/**
 * Install scraping tools
 */
export async function installScraperTools(): Promise<Record<string, { installed: boolean; error: string | null }>> {
  try {
    console.log('[RICH-SCRAPER] Installing tools...');
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'richScraper.py');
    const { stdout } = await execFileAsync(
      'python',
      [pythonScript, 'install'],
      { timeout: 180000 } // 3 minutes
    );

    const result = JSON.parse(stdout);
    console.log('[RICH-SCRAPER] Installation result:', result);
    
    return result;
  } catch (error: any) {
    console.error('[RICH-SCRAPER] Installation failed:', error.message);
    throw error;
  }
}

/**
 * Convert rich scraper data to PlatformAccount format
 */
export function convertRichDataToAccounts(
  result: RichScraperResult,
  capturedAt: string
): PlatformAccount[] {
  return result.profiles
    .filter(profile => profile.success)
    .map(profile => {
      const account: PlatformAccount = {
        platform: profile.platform as any,
        username: profile.username,
        profileUrl: getProfileUrl(profile.platform, profile.username),
        displayName: profile.full_name || profile.display_name || profile.username,
        bio: profile.biography || profile.description || `Rich ${profile.platform} profile data`,
        followers: profile.followers || 0,
        confidence: 'CONFIRMED' as const,
        reason: `Rich scraper (${result.platforms_scraped.join(', ')}) - detailed data`,
        capturedAt,
        deepfakeFlag: false,
        creationDate: new Date().toISOString().slice(0, 10),
      };

      // Add platform-specific data
      if (profile.profile_pic_url) {
        account.profilePicUrl = profile.profile_pic_url;
      } else if (profile.profile_image) {
        account.profilePicUrl = profile.profile_image;
      }

      // Add verification status
      if (profile.is_verified || profile.verified) {
        account.bio = `✓ Verified | ${account.bio}`;
      }

      // Add post/tweet count to bio
      if (profile.posts_count) {
        account.bio = `${profile.posts_count} posts | ${account.bio}`;
      } else if (profile.tweets_count) {
        account.bio = `${profile.tweets_count} tweets | ${account.bio}`;
      }

      return account;
    });
}

function getProfileUrl(platform: string, username: string): string {
  const urls: Record<string, string> = {
    instagram: `https://www.instagram.com/${username}`,
    twitter: `https://twitter.com/${username}`,
    reddit: `https://www.reddit.com/user/${username}`,
    telegram: `https://t.me/${username}`,
  };
  return urls[platform] || `https://${platform}.com/${username}`;
}

/**
 * Get human-readable summary of scraped data
 */
export function getRichDataSummary(result: RichScraperResult): string {
  const successCount = result.platforms_scraped.length;
  const errorCount = result.errors.length;
  
  if (successCount === 0) {
    return `No rich data available. ${errorCount > 0 ? `Errors: ${result.errors.join(', ')}` : ''}`;
  }
  
  const details = result.profiles
    .filter(p => p.success)
    .map(p => {
      if (p.platform === 'instagram') {
        return `Instagram: ${p.followers || 0} followers${p.is_verified ? ' ✓' : ''}`;
      } else if (p.platform === 'twitter') {
        return `Twitter: ${p.followers || 0} followers${p.verified ? ' ✓' : ''}`;
      } else if (p.platform === 'reddit') {
        return `Reddit: ${(p.link_karma || 0) + (p.comment_karma || 0)} karma`;
      }
      return p.platform;
    });
  
  return `Rich data: ${details.join(' | ')}`;
}
