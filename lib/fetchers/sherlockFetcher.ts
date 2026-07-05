/**
 * Sherlock/Maigret Integration for TypeScript
 * Searches usernames across 400-3000+ social networks
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { PlatformAccount } from '../types';

const execFileAsync = promisify(execFile);

export interface SherlockResult {
  username: string;
  mode: 'quick' | 'deep';
  tools_available: {
    sherlock: boolean;
    maigret: boolean;
  };
  accounts_found: number;
  accounts: Array<{
    platform: string;
    username: string;
    url: string;
    status: string;
    tool: string;
    metadata?: {
      tags?: string[];
      type?: string;
    };
  }>;
  platforms: string[];
}

/**
 * Check if Sherlock/Maigret tools are available
 */
export async function checkSherlockTools(): Promise<{ sherlock: boolean; maigret: boolean }> {
  try {
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'sherlockIntegration.py');
    const { stdout } = await execFileAsync('python', [pythonScript, '--check-tools'], {
      timeout: 5000
    });
    const result = JSON.parse(stdout);
    return result.tools_available || { sherlock: false, maigret: false };
  } catch (error) {
    console.error('[SHERLOCK] Tool check failed:', error);
    return { sherlock: false, maigret: false };
  }
}

/**
 * Search username using Sherlock/Maigret
 * @param username - Username to search
 * @param mode - 'quick' (Sherlock, 30s, 400+ sites) or 'deep' (Maigret, 60s, 3000+ sites)
 * @param capturedAt - Timestamp for the search
 * @returns Array of found platform accounts
 */
export async function searchWithSherlock(
  username: string,
  mode: 'quick' | 'deep' = 'quick',
  capturedAt: string
): Promise<PlatformAccount[]> {
  const accounts: PlatformAccount[] = [];

  try {
    console.log(`[SHERLOCK] Starting ${mode} mode search for "${username}"`);
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'sherlockIntegration.py');
    
    const { stdout, stderr } = await execFileAsync(
      'python',
      [pythonScript, username, mode],
      {
        timeout: mode === 'quick' ? 40000 : 80000, // 40s quick, 80s deep
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large output
      }
    );

    if (stderr) {
      console.log('[SHERLOCK] stderr:', stderr);
    }

    const result: SherlockResult = JSON.parse(stdout);
    
    console.log(`[SHERLOCK] Found ${result.accounts_found} accounts across ${result.platforms.length} platforms`);
    console.log(`[SHERLOCK] Tools used: ${result.tools_available.sherlock ? 'Sherlock' : ''} ${result.tools_available.maigret ? 'Maigret' : ''}`);

    // Convert Sherlock results to PlatformAccount format
    for (const acc of result.accounts) {
      accounts.push({
        platform: normalizeSherlockPlatform(acc.platform),
        username: acc.username,
        profileUrl: acc.url,
        displayName: acc.username,
        bio: `Public profile discovered via ${acc.tool.toUpperCase()} OSINT scan${acc.metadata?.tags ? ` (${acc.metadata.tags.join(', ')})` : ''}`,
        followers: 0,
        confidence: 'PROBABLE' as const,
        reason: `Discovered by ${acc.tool} across extended social network database`,
        capturedAt,
        profilePicUrl: undefined,
        deepfakeFlag: false,
        creationDate: new Date().toISOString().slice(0, 10),
      });
    }

    return accounts;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('[SHERLOCK] Python not found. Please ensure Python is installed and in PATH.');
    } else if (error.killed) {
      console.error('[SHERLOCK] Search timeout - consider using quick mode for faster results');
    } else {
      console.error('[SHERLOCK] Search failed:', error.message);
    }
    return [];
  }
}

/**
 * Normalize Sherlock platform names to our standard platform names
 */
function normalizeSherlockPlatform(platform: string): string {
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
  };

  const normalized = platform.toLowerCase().replace(/[^a-z0-9]/g, '');
  return platformMap[normalized] || platform.toLowerCase();
}

/**
 * Install Sherlock and Maigret tools
 * Note: Requires Python and pip to be available
 */
export async function installSherlockTools(): Promise<{
  sherlock: { installed: boolean; error: string | null };
  maigret: { installed: boolean; error: string | null };
}> {
  try {
    console.log('[SHERLOCK] Installing tools...');
    
    const pythonScript = path.join(process.cwd(), 'lib', 'osint', 'sherlockIntegration.py');
    const { stdout } = await execFileAsync(
      'python',
      [pythonScript, '--install'],
      { timeout: 180000 } // 3 minutes for installation
    );

    const result = JSON.parse(stdout);
    console.log('[SHERLOCK] Installation result:', result);
    
    return result;
  } catch (error: any) {
    console.error('[SHERLOCK] Installation failed:', error.message);
    return {
      sherlock: { installed: false, error: error.message },
      maigret: { installed: false, error: error.message }
    };
  }
}
