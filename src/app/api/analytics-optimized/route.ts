import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

function stringifyBigInts(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(stringifyBigInts);
  }
  if (typeof obj === 'object') {
    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = stringifyBigInts(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get('includeCounts') !== 'false';
    const includeRecentAnalyses = searchParams.get('includeRecentAnalyses') !== 'false';
    const recentAnalysesLimit = searchParams.has('recentAnalysesLimit')
      ? parseInt(searchParams.get('recentAnalysesLimit')!, 10)
      : 5;
    const timeframe = (searchParams.get('timeframe') || '7d') as '24h' | '7d' | '30d';

    // Get basic analytics data
    const [uploads, analyses, actionItemsAnalytics] = await Promise.all([
      DatabaseStorage.getUploadsByUser(user.id, { includeAnalyses: false, page: 1, limit: 1000 }),
      DatabaseStorage.getAnalysesByUser(user.id),
      DatabaseStorage.getActionItemsAnalytics(user.id, timeframe)
    ]);

    const userAnalytics = {
      uploads,
      analyses,
      actionItems: actionItemsAnalytics
    };

    return NextResponse.json({
      success: true,
      analytics: stringifyBigInts(userAnalytics),
    });

  } catch (error) {
    Logger.error('[Analytics API Optimized] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}