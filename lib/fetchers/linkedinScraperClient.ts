/**
 * LinkedIn Scraper Client
 * Communicates with the Python linkedin_scraper service
 */

const PYTHON_SERVICE_URL = process.env.LINKEDIN_SCRAPER_URL || 'http://localhost:5001';

export interface LinkedInPersonData {
  name: string;
  headline?: string;
  location?: string;
  about?: string;
  linkedin_url: string;
  experiences?: Array<{
    title?: string;
    company?: string;
    location?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    duration?: string;
  }>;
  educations?: Array<{
    school?: string;
    degree?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
  }>;
  skills?: string[];
  accomplishments?: any;
}

export interface LinkedInCompanyData {
  name: string;
  industry?: string;
  company_size?: string;
  headquarters?: string;
  founded?: string;
  specialties?: string[];
  about?: string;
  linkedin_url: string;
}

export interface ScraperResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  needs_auth?: boolean;
  rate_limited?: boolean;
  cached?: boolean;
}

export interface HealthStatus {
  status: string;
  scraper_available: boolean;
  authenticated: boolean;
  session_file_exists: boolean;
}

/**
 * Check if the Python scraper service is running and healthy
 */
export async function checkScraperHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('[LINKEDIN_SCRAPER] Service health check failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data as HealthStatus;
  } catch (error) {
    console.error('[LINKEDIN_SCRAPER] Service not available:', error);
    return null;
  }
}

/**
 * Scrape a LinkedIn person profile
 */
export async function scrapeLinkedInPerson(
  username: string
): Promise<ScraperResponse<LinkedInPersonData>> {
  try {
    // Normalize username to URL
    let url = username;
    if (!url.startsWith('http')) {
      url = url.startsWith('/in/') 
        ? `https://www.linkedin.com${url}`
        : `https://www.linkedin.com/in/${url.replace('@', '')}`;
    }
    
    console.log(`[LINKEDIN_SCRAPER] Scraping person: ${url}`);
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/scrape/person`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      const cacheInfo = data.cached ? ' (from cache)' : '';
      console.log(`[LINKEDIN_SCRAPER] ✅ Successfully scraped: ${data.data?.name}${cacheInfo}`);
    } else if (data.rate_limited) {
      console.warn(`[LINKEDIN_SCRAPER] ⏱️ Rate limited:`, data.error);
    } else {
      console.error(`[LINKEDIN_SCRAPER] ❌ Scraping failed:`, data.error);
    }
    
    return data;
  } catch (error) {
    console.error('[LINKEDIN_SCRAPER] Request failed:', error);
    return {
      success: false,
      error: `Service unavailable: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Scrape a LinkedIn company page
 */
export async function scrapeLinkedInCompany(
  companyName: string
): Promise<ScraperResponse<LinkedInCompanyData>> {
  try {
    // Normalize company name to URL
    let url = companyName;
    if (!url.startsWith('http')) {
      url = url.startsWith('/company/') 
        ? `https://www.linkedin.com${url}`
        : `https://www.linkedin.com/company/${url}`;
    }
    
    console.log(`[LINKEDIN_SCRAPER] Scraping company: ${url}`);
    
    const response = await fetch(`${PYTHON_SERVICE_URL}/scrape/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      const cacheInfo = data.cached ? ' (from cache)' : '';
      console.log(`[LINKEDIN_SCRAPER] ✅ Successfully scraped: ${data.data?.name}${cacheInfo}`);
    } else if (data.rate_limited) {
      console.warn(`[LINKEDIN_SCRAPER] ⏱️ Rate limited:`, data.error);
    } else {
      console.error(`[LINKEDIN_SCRAPER] ❌ Scraping failed:`, data.error);
    }
    
    return data;
  } catch (error) {
    console.error('[LINKEDIN_SCRAPER] Request failed:', error);
    return {
      success: false,
      error: `Service unavailable: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Check authentication status
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean } | null> {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/auth/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) return null;
    
    return await response.json();
  } catch (error) {
    console.error('[LINKEDIN_SCRAPER] Auth check failed:', error);
    return null;
  }
}
