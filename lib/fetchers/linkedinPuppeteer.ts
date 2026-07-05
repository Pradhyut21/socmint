/**
 * LinkedIn Scraper using linkedin-profile-scraper (Puppeteer-based)
 * Uses li_at session cookie for authentication
 */

import { LinkedInProfileScraper } from 'linkedin-profile-scraper';

// Type definitions based on the library's response format
export interface LinkedInProfile {
  userProfile: {
    fullName: string;
    title?: string;
    location?: {
      city?: string;
      province?: string;
      country?: string;
    };
    photo?: string;
    description?: string;
    url: string;
  };
  experiences?: Array<{
    title?: string;
    company?: string;
    employmentType?: string;
    location?: {
      city?: string;
      province?: string;
      country?: string;
    };
    startDate?: string;
    endDate?: string;
    endDateIsPresent?: boolean;
    description?: string;
    durationInDays?: number;
  }>;
  education?: Array<{
    schoolName?: string;
    degreeName?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    durationInDays?: number;
  }>;
  volunteerExperiences?: Array<{
    title?: string;
    company?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }>;
  skills?: Array<{
    skillName: string;
    endorsementCount: number;
  }>;
}

export interface LinkedInScraperResult {
  success: boolean;
  data?: LinkedInProfile;
  error?: string;
  sessionExpired?: boolean;
}

let scraperInstance: LinkedInProfileScraper | null = null;
let isSetup = false;

/**
 * Get or create scraper instance
 */
async function getScraperInstance(): Promise<LinkedInProfileScraper | null> {
  const sessionCookie = process.env.LINKEDIN_SESSION_COOKIE;
  
  if (!sessionCookie) {
    console.warn('[LINKEDIN_PUPPETEER] No LINKEDIN_SESSION_COOKIE found in environment');
    return null;
  }
  
  if (!scraperInstance) {
    console.log('[LINKEDIN_PUPPETEER] Creating new scraper instance...');
    scraperInstance = new LinkedInProfileScraper({
      sessionCookieValue: sessionCookie,
      keepAlive: true  // Keep browser alive for faster recurring scrapes
    });
  }
  
  if (!isSetup) {
    try {
      console.log('[LINKEDIN_PUPPETEER] Setting up scraper...');
      await scraperInstance.setup();
      isSetup = true;
      console.log('[LINKEDIN_PUPPETEER] ✅ Scraper ready');
    } catch (error) {
      console.error('[LINKEDIN_PUPPETEER] Setup failed:', error);
      scraperInstance = null;
      return null;
    }
  }
  
  return scraperInstance;
}

/**
 * Scrape a LinkedIn profile
 */
export async function scrapeLinkedInProfile(
  profileUrl: string
): Promise<LinkedInScraperResult> {
  try {
    const scraper = await getScraperInstance();
    
    if (!scraper) {
      return {
        success: false,
        error: 'LinkedIn scraper not configured. Add LINKEDIN_SESSION_COOKIE to .env.local'
      };
    }
    
    // Normalize URL
    let url = profileUrl;
    if (!url.startsWith('http')) {
      url = url.startsWith('/in/')
        ? `https://www.linkedin.com${url}`
        : `https://www.linkedin.com/in/${url.replace('@', '')}`;
    }
    
    console.log(`[LINKEDIN_PUPPETEER] Scraping: ${url}`);
    
    const result = await scraper.run(url);
    
    console.log(`[LINKEDIN_PUPPETEER] ✅ Successfully scraped: ${result.userProfile?.fullName}`);
    
    return {
      success: true,
      data: result as LinkedInProfile
    };
    
  } catch (error: any) {
    console.error('[LINKEDIN_PUPPETEER] Scraping failed:', error.message);
    
    // Check if session expired
    if (error.name === 'SessionExpired' || error.message?.includes('not logged')) {
      return {
        success: false,
        error: 'LinkedIn session expired. Please update LINKEDIN_SESSION_COOKIE',
        sessionExpired: true
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Close the scraper and cleanup
 */
export async function closeLinkedInScraper() {
  if (scraperInstance) {
    try {
      // The library doesn't expose a close method, but we can reset
      scraperInstance = null;
      isSetup = false;
      console.log('[LINKEDIN_PUPPETEER] Scraper closed');
    } catch (error) {
      console.error('[LINKEDIN_PUPPETEER] Error closing scraper:', error);
    }
  }
}

/**
 * Check if LinkedIn scraper is available
 */
export function isLinkedInScraperAvailable(): boolean {
  return !!process.env.LINKEDIN_SESSION_COOKIE;
}
