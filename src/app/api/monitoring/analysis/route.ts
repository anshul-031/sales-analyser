import { NextRequest, NextResponse } from 'next/server';
import { analysisMonitor } from '@/lib/analysis-monitor';
import { getAuthenticatedUser } from '@/lib/auth';
import { Logger } from '@/lib/utils';

/**
 * @swagger
 * /api/monitoring/analysis:
 *   get:
 *     tags: [Monitoring]
 *     summary: Get analysis monitoring statistics
 *     description: Retrieve current statistics about in-progress analyses for monitoring purposes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monitoring statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalInProgress:
 *                       type: number
 *                       description: Total number of analyses currently in progress
 *                     byStage:
 *                       type: object
 *                       description: Distribution of analyses by stage
 *                     longestRunning:
 *                       type: object
 *                       description: Information about the longest running analysis
 *                       properties:
 *                         id:
 *                           type: string
 *                         filename:
 *                           type: string
 *                         elapsedTime:
 *                           type: number
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function GET(request: NextRequest) {
  const requestId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    Logger.info(`[Monitoring API] [${requestId}] GET request received`);
    
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      Logger.warn(`[Monitoring API] [${requestId}] Authentication failed`);
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    Logger.info(`[Monitoring API] [${requestId}] User authenticated:`, user.id);

    // Get monitoring statistics
    const stats = analysisMonitor.getMonitoringStats();
    
    Logger.info(`[Monitoring API] [${requestId}] Retrieved monitoring stats:`, {
      totalInProgress: stats.totalInProgress,
      stageCount: Object.keys(stats.byStage).length,
      hasLongestRunning: !!stats.longestRunning
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    Logger.error(`[Monitoring API] [${requestId}] Request failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve monitoring statistics'
    }, { status: 500 });
  }
}
