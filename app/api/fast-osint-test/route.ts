import { NextRequest, NextResponse } from 'next/server';
import { fastUsernameSearch } from '@/lib/fetchers/fastOSINT';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') || 'kishansaaai';
  
  console.log(`[FAST-OSINT-TEST] Testing Fast OSINT for username: ${username}`);
  
  const startTime = Date.now();
  
  try {
    const result = await fastUsernameSearch(username, 15000); // 15 second timeout
    
    const duration = Date.now() - startTime;
    
    console.log(`[FAST-OSINT-TEST] Completed in ${duration}ms`);
    console.log(`[FAST-OSINT-TEST] Found ${result.accounts_found} accounts`);
    
    return NextResponse.json({
      success: true,
      username,
      duration_ms: result.duration_ms,
      accounts_found: result.accounts_found,
      total_checked: result.accounts.length,
      accounts_that_exist: result.accounts.filter(a => a.exists).map(acc => ({
        platform: acc.platform,
        username: acc.username,
        url: acc.url,
        exists: acc.exists,
        displayName: acc.displayName,
        followers: acc.followers,
        bio: acc.bio?.slice(0, 100),
        profilePicUrl: acc.profilePicUrl,
        verified: acc.verified,
        location: acc.location,
        website: acc.website,
        source: acc.source
      })),
      all_accounts: result.accounts.map(acc => ({
        platform: acc.platform,
        exists: acc.exists,
        url: acc.url
      }))
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[FAST-OSINT-TEST] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: duration
    }, { status: 500 });
  }
}
