import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    Logger.info('[Analytics API] Fetching analytics for user:', userId);

    // Get comprehensive user analytics
    const userAnalytics = await DatabaseStorage.getUserAnalyticsData(userId);

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
