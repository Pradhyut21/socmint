/**
 * Unified OSINT Toolkit Integration
 * Combines 20+ username and email reconnaissance tools
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { PlatformAccount } from '../types';

const execFileAsync = promisify(execFile);

export interface OSINTToolsStatus {
  sherlock: boolean;
  maigret: boolean;
  blackbird: boolean;
  nexfil: boolean;
  socialscan: boolean;
  holehe: boolean;
  osrframework: boolean;
  h8mail: boolean;
  theHarvester: boolean;
  infoga: boolean;
  social_analyzer: boolean;
  gitrecon: boolean;
}

export interface UsernameSearchResult {
  username: string;
  tools_used: string[];
  accounts_found: number;
  accounts: Array<{
    platform: string;
    username: string;
    url: string;
    tool: string;
    tags?: string[];
  }>;
  errors: string[];
}

export interface EmailSearchResult {
  email: string;
  tools_used: string[];
  registrations_found: number;
  sites: string[];
  breaches: string[];
  errors: string[];
}

/**
 * Check which OSINT tools are installed
 */
export async function checkOSINTTools(): Promise<OSINTToolsStatus> {
  try {
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'osintToolkit.py');
    const { stdout } = await execFileAsync('python', [pythonScript, 'check-tools'], {
      timeout: 10000
    });
    
    const result = JSON.parse(stdout);
    return result.tools || {};
  } catch (error) {
    console.error('[OSINT] Tool check failed:', error);
    return {
      sherlock: false,
      maigret: false,
      blackbird: false,
      nexfil: false,
      socialscan: false,
      holehe: false,
      osrframework: false,
      h8mail: false,
      theHarvester: false,
      infoga: false,
      social_analyzer: false,
      gitrecon: false
    };
  }
}

/**
 * Search username using unified OSINT toolkit
 * Runs multiple tools in parallel: Sherlock, Maigret, Blackbird, Socialscan
 * 
 * @param username - Username to search
 * @param timeout - Timeout in seconds (default: 45s)
 * @param capturedAt - Timestamp for the search
 * @returns Array of found platform accounts
 */
export async function searchUsernameOSINT(
  username: string,
  timeout: number = 45,
  capturedAt: string
): Promise<{accounts: PlatformAccount[], metadata: { tools_used: string[], errors: string[] }}> {
  const accounts: PlatformAccount[] = [];
  let metadata = { tools_used: [] as string[], errors: [] as string[] };

  try {
    console.log(`[OSINT] Starting unified search for "${username}" (timeout: ${timeout}s)`);
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'osintToolkit.py');
    
    const { stdout, stderr } = await execFileAsync(
      'python',
      [pythonScript, 'search-username', username, timeout.toString()],
      {
        timeout: (timeout + 15) * 1000,
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      }
    );

    if (stderr) {
      console.log('[OSINT] stderr:', stderr);
    }

    const result: UsernameSearchResult = JSON.parse(stdout);
    
    console.log(`[OSINT] Found ${result.accounts_found} accounts using ${result.tools_used.length} tools`);
    console.log(`[OSINT] Tools: ${result.tools_used.join(', ')}`);
    
    if (result.errors.length > 0) {
      console.log(`[OSINT] Errors: ${result.errors.join(', ')}`);
    }

    metadata = {
      tools_used: result.tools_used,
      errors: result.errors
    };

    // Convert OSINT results to PlatformAccount format
    for (const acc of result.accounts) {
      accounts.push({
        platform: normalizePlatform(acc.platform),
        username: acc.username,
        profileUrl: acc.url,
        displayName: acc.username,
        bio: `Discovered via ${acc.tool.toUpperCase()} OSINT toolkit${acc.tags ? ` [${acc.tags.join(', ')}]` : ''}`,
        followers: 0,
        confidence: 'PROBABLE' as const,
        reason: `Multi-tool OSINT scan (${result.tools_used.join(', ')})`,
        capturedAt,
        profilePicUrl: undefined,
        deepfakeFlag: false,
        creationDate: new Date().toISOString().slice(0, 10),
      });
    }

    return { accounts, metadata };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('[OSINT] Python not found. Ensure Python 3.x is installed.');
    } else if (error.killed) {
      console.error('[OSINT] Search timeout - tools took too long');
    } else {
      console.error('[OSINT] Search failed:', error.message);
    }
    return { accounts: [], metadata };
  }
}

/**
 * Search email using unified OSINT toolkit
 * Runs: holehe, h8mail, socialscan
 * 
 * @param email - Email to search
 * @param timeout - Timeout in seconds (default: 45s)
 * @returns Sites where email is registered and breach data
 */
export async function searchEmailOSINT(
  email: string,
  timeout: number = 45
): Promise<EmailSearchResult> {
  try {
    console.log(`[OSINT] Starting email search for "${email}"`);
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'osintToolkit.py');
    
    const { stdout } = await execFileAsync(
      'python',
      [pythonScript, 'search-email', email, timeout.toString()],
      {
        timeout: (timeout + 15) * 1000,
        maxBuffer: 1024 * 1024 * 20
      }
    );

    const result: EmailSearchResult = JSON.parse(stdout);
    
    console.log(`[OSINT] Email found on ${result.registrations_found} sites`);
    console.log(`[OSINT] Tools used: ${result.tools_used.join(', ')}`);
    
    return result;
  } catch (error: any) {
    console.error('[OSINT] Email search failed:', error.message);
    return {
      email,
      tools_used: [],
      registrations_found: 0,
      sites: [],
      breaches: [],
      errors: [error.message]
    };
  }
}

/**
 * Install OSINT tools
 * 
 * @param tools - Array of tool names to install, or ['all'] for all tools
 * @returns Installation results for each tool
 */
export async function installOSINTTools(
  tools: string[] = ['all']
): Promise<Record<string, { installed: boolean; error: string | null }>> {
  try {
    console.log(`[OSINT] Installing tools: ${tools.join(', ')}`);
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'osintToolkit.py');
    
    const { stdout } = await execFileAsync(
      'python',
      [pythonScript, 'install', tools.join(',')],
      { timeout: 300000 } // 5 minutes for installation
    );

    const result = JSON.parse(stdout);
    console.log('[OSINT] Installation result:', result);
    
    return result;
  } catch (error: any) {
    console.error('[OSINT] Installation failed:', error.message);
    throw error;
  }
}

/**
 * Normalize platform names to match our internal schema
 */
function normalizePlatform(platform: string): string {
  const platformMap: Record<string, string> = {
    'github': 'github',
    'gitlab': 'gitlab',
    'reddit': 'reddit',
    'linkedin': 'linkedin',
    'instagram': 'instagram',
    'youtube': 'youtube',
    'twitter': 'twitter',
    'facebook': 'facebook',
    'tiktok': 'tiktok',
    'snapchat': 'snapchat',
    'pinterest': 'pinterest',
    'tumblr': 'tumblr',
    'medium': 'medium',
    'telegram': 'telegram',
    'quora': 'quora',
    'soundcloud': 'soundcloud',
    'steam': 'steam',
    'hackernews': 'hackernews',
    'devto': 'devto',
    'dev.to': 'devto',
    'stackoverflow': 'stackoverflow',
    'vk': 'vk',
    'vimeo': 'vimeo',
    'flickr': 'flickr',
    'pastebin': 'pastebin',
  };

  const normalized = platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  return platformMap[normalized] || platform.toLowerCase();
}

/**
 * Get human-readable description of available tools
 */
export function getToolsDescription(tools: OSINTToolsStatus): string[] {
  const descriptions: string[] = [];
  
  if (tools.sherlock) descriptions.push('Sherlock (400+ sites)');
  if (tools.maigret) descriptions.push('Maigret (3000+ sites)');
  if (tools.blackbird) descriptions.push('Blackbird (fast scanner)');
  if (tools.socialscan) descriptions.push('Socialscan (availability checker)');
  if (tools.holehe) descriptions.push('Holehe (email on 120+ sites)');
  if (tools.h8mail) descriptions.push('h8mail (breach hunter)');
  
  return descriptions;
}
