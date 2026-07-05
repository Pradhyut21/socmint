import { NextRequest, NextResponse } from 'next/server';
import { checkUsernameWithSherlockData, findUsernamePlatforms } from '@/lib/fetchers/sherlockAPI';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') || 'kishansaaai';
  
  console.log(`[SHERLOCK-TEST] Testing Sherlock API for username: ${username}`);
  
  const startTime = Date.now();
  
  try {
    const results = await checkUsernameWithSherlockData(username, 15000); // 15 second timeout
    
    const duration = Date.now() - startTime;
    const foundAccounts = results.filter(r => r.exists);
    
    console.log(`[SHERLOCK-TEST] Completed in ${duration}ms`);
    console.log(`[SHERLOCK-TEST] Checked ${results.length} platforms, found ${foundAccounts.length} accounts`);
    
    return NextResponse.json({
      success: true,
      username,
      duration_ms: duration,
      platforms_checked: results.length,
      accounts_found: foundAccounts.length,
      accounts: foundAccounts.map(r => ({
        platform: r.platform,
        url: r.url,
        response_time: r.response_time
      })),
      all_results: results.slice(0, 20) // First 20 for debugging
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[SHERLOCK-TEST] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: duration
    }, { status: 500 });
  }
}
