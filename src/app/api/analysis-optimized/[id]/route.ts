import { NextRequest, NextResponse } from 'next/server';
import { OptimizedDatabaseStorage } from '@/lib/db-optimized';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/serialization';

/**
 * Optimized analysis API endpoint for on-demand data loading
 * Separates analysis metadata from large content (transcription, full results)
 */

/**
 * @swagger
 * /api/analysis-optimized/{id}:
 *   get:
 *     tags: [Analysis - Optimized]
 *     summary: Get analysis data with selective content loading
 *     description: Retrieve analysis data with options to load large content only when needed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Analysis ID
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *           enum: [summary, result, transcription, all]
 *           default: summary
 *         description: What data to include (summary = metadata only, result = analysis results, transcription = transcription text, all = everything)
 *     responses:
 *       200:
 *         description: Analysis data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysis:
 *                   type: object
 *                 contentType:
 *                   type: string
 *                   enum: [summary, result, transcription, full]
 *                 bandwidthUsed:
 *                   type: string
 *       404:
 *         description: Analysis not found
 *       401:
 *         description: Authentication required
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const params = await context.params;
    const analysisId = params.id;
    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include') || 'summary';

    Logger.info(`[Analysis API Optimized] Fetching analysis ${analysisId} with include: ${include}`);

    let analysisData;
    let contentType;
    let bandwidthEstimate;

    switch (include) {
      case 'summary':
        analysisData = await OptimizedDatabaseStorage.getAnalysisSummary(analysisId, user.id);
        contentType = 'summary';
        bandwidthEstimate = 'Small (~1-5KB)';
        break;

      case 'result':
        const [summary, result] = await Promise.all([
          OptimizedDatabaseStorage.getAnalysisSummary(analysisId, user.id),
          OptimizedDatabaseStorage.getAnalysisResult(analysisId, user.id),
        ]);
        analysisData = { ...summary, analysisResult: result };
        contentType = 'result';
        bandwidthEstimate = 'Medium (~10-50KB)';
        break;

      case 'transcription':
        const [summaryForTranscription, transcription] = await Promise.all([
          OptimizedDatabaseStorage.getAnalysisSummary(analysisId, user.id),
          OptimizedDatabaseStorage.getTranscription(analysisId, user.id),
        ]);
        analysisData = { ...summaryForTranscription, transcription };
        contentType = 'transcription';
        bandwidthEstimate = 'Large (~50-200KB)';
        break;

      case 'all':
        const [summaryForAll, resultForAll, transcriptionForAll] = await Promise.all([
          OptimizedDatabaseStorage.getAnalysisSummary(analysisId, user.id),
          OptimizedDatabaseStorage.getAnalysisResult(analysisId, user.id).catch(() => null),
          OptimizedDatabaseStorage.getTranscription(analysisId, user.id).catch(() => null),
        ]);
        analysisData = { 
          ...summaryForAll, 
          analysisResult: resultForAll,
          transcription: transcriptionForAll 
        };
        contentType = 'full';
        bandwidthEstimate = 'Very Large (~100-500KB)';
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid include parameter. Use: summary, result, transcription, or all'
        }, { status: 400 });
    }

    if (!analysisData) {
      return NextResponse.json({
        success: false,
        error: 'Analysis not found or access denied'
      }, { status: 404 });
    }

    Logger.info(`[Analysis API Optimized] Successfully retrieved ${contentType} data for analysis ${analysisId}`);

    return NextResponse.json({
      success: true,
      analysis: serializeBigInt(analysisData),
      contentType,
      bandwidthUsed: bandwidthEstimate,
      meta: {
        retrievedAt: new Date().toISOString(),
        optimized: true,
        recommendation: include === 'all' ? 'Consider using specific includes for better performance' : 'Optimal bandwidth usage',
      },
    });

  } catch (error) {
    Logger.error('[Analysis API Optimized] Request failed:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Analysis not found or access denied'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
