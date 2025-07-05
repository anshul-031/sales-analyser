import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics data
 *     description: Retrieve comprehensive analytics and insights data for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error while fetching analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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

    const { searchParams } = new URL(request.url);
    const optimized = searchParams.get('optimized') !== 'false'; // Default to optimized
    const includeActivity = searchParams.get('includeActivity') === 'true';

    Logger.info(`[Analytics API] Fetching analytics for user: ${user.id}, optimized: ${optimized}`);

    const userAnalytics = await DatabaseStorage.getUserAnalyticsData(user.id);
    const globalStats = await DatabaseStorage.getGlobalStats();

    return NextResponse.json({
      success: true,
      user: userAnalytics,
      global: globalStats,
      optimized: false,
      warning: 'Using legacy full data loading - consider using optimized=true',
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
