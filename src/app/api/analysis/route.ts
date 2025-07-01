import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/analysis:
 *   post:
 *     tags: [Analysis]
 *     summary: Start analysis for multiple files
 *     description: Initialize analysis for multiple uploaded files with custom parameters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *               - userId
 *               - parameters
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of upload IDs to analyze
 *               userId:
 *                 type: string
 *                 description: User ID
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     prompt:
 *                       type: string
 *                     enabled:
 *                       type: boolean
 *                 description: Analysis parameters
 *     responses:
 *       200:
 *         description: Analysis started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analyses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       uploadId:
 *                         type: string
 *                       status:
 *                         type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[Analysis API] === ANALYSIS REQUEST RECEIVED ===');
    
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      console.log('[Analysis API] Authentication failed - no user');
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    console.log('[Analysis API] Request body:', JSON.stringify(body, null, 2));
    
    const { fileIds, userId, parameters } = body;

    // Validate required fields
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      console.log('[Analysis API] Invalid fileIds:', fileIds);
      return NextResponse.json({
        success: false,
        error: 'fileIds array is required and must not be empty'
      }, { status: 400 });
    }

    if (!userId) {
      console.log('[Analysis API] Missing userId');
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }

    if (!parameters || !Array.isArray(parameters)) {
      console.log('[Analysis API] Invalid parameters:', parameters);
      return NextResponse.json({
        success: false,
        error: 'parameters array is required'
      }, { status: 400 });
    }

    // Verify user match
    if (userId !== user.id) {
      console.log('[Analysis API] User ID mismatch. Expected:', user.id, 'Got:', userId);
      return NextResponse.json({
        success: false,
        error: 'User ID mismatch'
      }, { status: 403 });
    }

    console.log('[Analysis API] Processing analysis for', fileIds.length, 'files');
    console.log('[Analysis API] File IDs:', fileIds);
    console.log('[Analysis API] User ID:', userId);
    console.log('[Analysis API] Parameters count:', parameters.length);

    // Call the analyze API endpoint with the appropriate format
    const analyzeResponse = await fetch(`${request.nextUrl.origin}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        uploadIds: fileIds,
        analysisType: 'parameters',
        customParameters: parameters
      }),
    });

    const analyzeResult = await analyzeResponse.json();
    console.log('[Analysis API] Analyze API response:', JSON.stringify(analyzeResult, null, 2));

    if (!analyzeResult.success) {
      console.error('[Analysis API] Analyze API failed:', analyzeResult.error);
      return NextResponse.json({
        success: false,
        error: analyzeResult.error || 'Failed to start analysis'
      }, { status: 500 });
    }

    console.log('[Analysis API] === ANALYSIS STARTED SUCCESSFULLY ===');
    console.log('[Analysis API] Analyses created:', analyzeResult.analyses?.length || 0);

    return NextResponse.json({
      success: true,
      analyses: analyzeResult.analyses || [],
      message: analyzeResult.message,
      summary: analyzeResult.summary
    });

  } catch (error) {
    console.error('[Analysis API] === ERROR ===', error);
    Logger.error('[Analysis API] Request failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
