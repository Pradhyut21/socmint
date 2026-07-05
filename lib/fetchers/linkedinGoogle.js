/**
 * LinkedIn Profile Discovery via Google Search
 * Bypasses LinkedIn's anti-scraping by using Google search results
 * No authentication required!
 */
/**
 * Check if a LinkedIn profile exists using Google search
 * This bypasses LinkedIn's anti-bot protection
 */
export async function findLinkedInViaGoogle(username, timeout = 10000) {
    try {
        // Add a small random delay to appear more human-like (100-500ms)
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
        // Build Google search query
        // Search for: site:linkedin.com/in/ "username"
        const query = encodeURIComponent(`site:linkedin.com/in/${username}`);
        const googleUrl = `https://www.google.com/search?q=${query}&hl=en`;
        console.log(`[LINKEDIN_GOOGLE] Searching: ${googleUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(googleUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
                'Referer': 'https://www.google.com/'
            }
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.log(`[LINKEDIN_GOOGLE] Google returned status ${response.status}`);
            // If rate limited, try simple URL existence check as fallback
            if (response.status === 429) {
                console.log(`[LINKEDIN_GOOGLE] Rate limited, trying direct URL check...`);
                return await checkLinkedInDirectly(username, timeout);
            }
            return null;
        }
        const html = await response.text();
        // Check if we got results
        // Google shows "did not match any documents" when no results
        if (html.includes('did not match any documents') ||
            html.includes('No results found') ||
            html.includes('Your search') && html.includes('did not match')) {
            console.log(`[LINKEDIN_GOOGLE] No profile found for ${username}`);
            return {
                exists: false,
                source: 'google-search'
            };
        }
        // Extract LinkedIn profile URL from search results
        // Google's HTML contains links like: /url?q=https://www.linkedin.com/in/username/...
        const urlMatch = html.match(/\/url\?q=(https:\/\/(?:www\.)?linkedin\.com\/in\/[^&"]+)/i) ||
            html.match(/(https:\/\/(?:www\.)?linkedin\.com\/in\/[^"<>\s]+)/i);
        if (!urlMatch) {
            console.log(`[LINKEDIN_GOOGLE] No LinkedIn URL found in results`);
            return {
                exists: false,
                source: 'google-search'
            };
        }
        const profileUrl = decodeURIComponent(urlMatch[1]).split('?')[0]; // Remove query params
        console.log(`[LINKEDIN_GOOGLE] Found profile: ${profileUrl}`);
        // Extract name and headline from Google's snippet
        // Google shows: "Name - Headline | LinkedIn"
        let name;
        let headline;
        let snippet;
        // Try to extract from page title or meta description
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            const title = titleMatch[1];
            // Format: "Name - Headline | LinkedIn"
            const parts = title.split('|')[0].trim().split(' - ');
            if (parts.length >= 1) {
                name = parts[0].trim();
            }
            if (parts.length >= 2) {
                headline = parts.slice(1).join(' - ').trim();
            }
        }
        // Try to extract snippet from search result description
        // Look for the snippet in the search result
        const snippetMatch = html.match(/<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([^<]+)<\/div>/i) ||
            html.match(/<span[^>]*class="[^"]*st[^"]*"[^>]*>([^<]+)<\/span>/i) ||
            html.match(/<div[^>]*class="[^"]*IsZvec[^"]*"[^>]*>([^<]+)<\/div>/i);
        if (snippetMatch) {
            snippet = snippetMatch[1].trim();
            // If snippet contains more info, try to extract headline from it
            if (!headline && snippet.includes('·')) {
                const snippetParts = snippet.split('·');
                if (snippetParts.length >= 2) {
                    headline = snippetParts[1].trim();
                }
            }
        }
        console.log(`[LINKEDIN_GOOGLE] ✅ Profile exists: ${name || username}`);
        return {
            exists: true,
            url: profileUrl,
            name: name || username,
            headline: headline,
            snippet: snippet,
            source: 'google-search'
        };
    }
    catch (error) {
        if (error.name === 'AbortError') {
            console.log(`[LINKEDIN_GOOGLE] Request timed out`);
        }
        else {
            console.error('[LINKEDIN_GOOGLE] Error:', error);
        }
        // Fallback to direct URL check
        console.log(`[LINKEDIN_GOOGLE] Falling back to direct URL check...`);
        return await checkLinkedInDirectly(username, timeout);
    }
}
/**
 * Fallback: Check if LinkedIn profile URL is accessible
 * Just checks if the URL returns 200 OK (without scraping content)
 */
async function checkLinkedInDirectly(username, timeout) {
    try {
        const url = `https://www.linkedin.com/in/${username}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
            method: 'HEAD', // Only get headers, not body
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        });
        clearTimeout(timeoutId);
        // LinkedIn returns 200 for valid profiles, 404 for non-existent
        const exists = response.status === 200 || response.status === 999; // 999 is LinkedIn's "we see you" status
        console.log(`[LINKEDIN_DIRECT] URL check: ${url} - Status: ${response.status} - Exists: ${exists}`);
        return {
            exists,
            url: exists ? url : undefined,
            name: exists ? username : undefined,
            source: 'direct-url-check'
        };
    }
    catch (error) {
        console.error('[LINKEDIN_DIRECT] Error:', error);
        return null;
    }
}
/**
 * Alternative: Search for LinkedIn profile by full name
 * Useful when you have a name but not the username
 */
export async function findLinkedInByName(fullName, additionalInfo, // e.g., company, location
timeout = 10000) {
    try {
        // Build query: "Full Name" site:linkedin.com/in/ "Company"
        let query = `"${fullName}" site:linkedin.com/in/`;
        if (additionalInfo) {
            query += ` "${additionalInfo}"`;
        }
        const encodedQuery = encodeURIComponent(query);
        const googleUrl = `https://www.google.com/search?q=${encodedQuery}`;
        console.log(`[LINKEDIN_GOOGLE] Searching by name: ${fullName}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(googleUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return null;
        }
        const html = await response.text();
        if (html.includes('did not match any documents')) {
            return {
                exists: false,
                source: 'google-search-by-name'
            };
        }
        // Extract first LinkedIn URL
        const urlMatch = html.match(/\/url\?q=(https:\/\/(?:www\.)?linkedin\.com\/in\/[^&"]+)/i);
        if (!urlMatch) {
            return {
                exists: false,
                source: 'google-search-by-name'
            };
        }
        const profileUrl = decodeURIComponent(urlMatch[1]).split('?')[0];
        return {
            exists: true,
            url: profileUrl,
            name: fullName,
            source: 'google-search-by-name'
        };
    }
    catch (error) {
        console.error('[LINKEDIN_GOOGLE] Error searching by name:', error);
        return null;
    }
}
