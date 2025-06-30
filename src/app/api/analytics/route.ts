import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    Logger.info('[Analytics API] Fetching analytics for user:', user.id);

    // Get comprehensive user analytics
    const userAnalytics = await DatabaseStorage.getUserAnalyticsData(user.id);

    // Get global stats for comparison
    const globalStats = await DatabaseStorage.getGlobalStats();

    return NextResponse.json({
      success: true,
      user: userAnalytics,
      global: globalStats,
    });

  } catch (error) {
    Logger.error('[Analytics API] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
