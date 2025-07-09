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

    console.log('[Analysis API] User authenticated:', user.id);

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

    // Filter out null, undefined, and empty string values from fileIds
    const validFileIds = fileIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validFileIds.length === 0) {
      console.log('[Analysis API] No valid file IDs after filtering:', fileIds);
      return NextResponse.json({
        success: false,
        error: 'No valid file IDs provided'
      }, { status: 400 });
    }

    if (validFileIds.length !== fileIds.length) {
      console.log('[Analysis API] Filtered out invalid file IDs:', fileIds.length - validFileIds.length, 'invalid IDs');
    }

    console.log('[Analysis API] Valid file IDs:', validFileIds);
    console.log('[Analysis API] Calling /api/analyze with parameters:', {
      uploadIds: validFileIds,
      analysisType: 'parameters',
      customParameters: parameters
    });

    // Fire-and-forget call to the analyze API endpoint.
    // We don't await the response to avoid Vercel function timeouts.
    fetch(`${request.nextUrl.origin}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
      body: JSON.stringify({
        uploadIds: validFileIds,
        analysisType: 'parameters',
        customParameters: parameters
      }),
    }).catch(error => {
      // This error won't be sent to the client, as we respond immediately.
      // This is for server-side logging of dispatch errors.
      console.error('[Analysis API] Error dispatching analysis request:', error);
    });

    console.log('[Analysis API] === ANALYSIS TRIGGERED SUCCESSFULLY ===');

    // Respond immediately to the client.
    // The frontend should poll for analysis status updates.
    return NextResponse.json({
      success: true,
      message: `Analysis successfully triggered for ${validFileIds.length} file(s).`,
      analyses: [], // Analyses are being created in the background.
      summary: {
        total: validFileIds.length,
        successful: validFileIds.length, // Optimistically assume triggering was successful
        failed: 0
      }
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
