/**
 * Test endpoint for LinkedIn authenticated search
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchLinkedInAuthenticated } from '@/lib/fetchers/linkedinAuthSearch';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || 'Bill Gates';
  
  console.log(`[TEST LINKEDIN AUTH] Testing search for: "${query}"`);
  
  // Check if credentials are configured
  const liAt = process.env.LINKEDIN_LI_AT;
  const jsessionId = process.env.LINKEDIN_JSESSIONID;
  
  const status = {
    credentialsConfigured: !!liAt,
    liAtLength: liAt?.length || 0,
    jsessionIdSet: !!jsessionId,
    query
  };
  
  if (!liAt) {
    return NextResponse.json({
      success: false,
      error: 'LinkedIn credentials not configured',
      status
    });
  }
  
  try {
    // Test the authenticated search
    const results = await searchLinkedInAuthenticated(query, 10);
    
    return NextResponse.json({
      success: true,
      query,
      totalFound: results.totalFound,
      profilesReturned: results.profiles.length,
      status,
      profiles: results.profiles.map(p => ({
        name: p.name,
        headline: p.headline,
        location: p.location,
        profileUrl: p.profileUrl,
        username: p.publicIdentifier,
        photoUrl: p.photoUrl,
        connectionDegree: p.connectionDegree,
        currentPositions: p.currentPositions
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      status
    }, { status: 500 });
  }
}
