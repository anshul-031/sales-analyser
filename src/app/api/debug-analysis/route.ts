import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Debug endpoint to inspect analysis data structure
 */
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
    const analysisId = searchParams.get('analysisId');
    const uploadId = searchParams.get('uploadId');

    Logger.info(`[Debug API] Request - analysisId: ${analysisId}, uploadId: ${uploadId}`);

    if (analysisId) {
      // Get specific analysis
      const analysis = await DatabaseStorage.getAnalysisById(analysisId);
      
      return NextResponse.json({
        success: true,
        type: 'analysis',
        data: analysis,
        debug: {
          hasAnalysisResult: !!analysis?.analysisResult,
          hasTranscription: !!analysis?.transcription,
          analysisStatus: analysis?.status,
          analysisResultType: typeof analysis?.analysisResult,
          analysisResultKeys: analysis?.analysisResult ? Object.keys(analysis.analysisResult) : [],
          rawAnalysisResult: analysis?.analysisResult,
        }
      });
    }

    if (uploadId) {
      // Get upload with analyses
      const upload = await DatabaseStorage.getUploadById(uploadId);
      
      return NextResponse.json({
        success: true,
        type: 'upload',
        data: upload,
        debug: {
          hasAnalyses: !!upload?.analyses && upload.analyses.length > 0,
          analysesCount: upload?.analyses?.length || 0,
          analysesData: upload?.analyses?.map(a => ({
            id: a.id,
            status: a.status,
            hasResult: !!a.analysisResult,
            hasTranscription: !!a.transcription,
            resultType: typeof a.analysisResult,
            resultKeys: a.analysisResult ? Object.keys(a.analysisResult) : [],
          }))
        }
      });
    }

    // Get all uploads for user
    const uploads = await DatabaseStorage.getUploadsByUser(user.id);
    
    return NextResponse.json({
      success: true,
      type: 'all_uploads',
      count: uploads.length,
      uploads: uploads.map(upload => ({
        id: upload.id,
        originalName: upload.originalName,
        analysesCount: upload.analyses?.length || 0,
        analyses: upload.analyses?.map(a => ({
          id: a.id,
          status: a.status,
          hasResult: !!a.analysisResult,
          hasTranscription: !!a.transcription,
          resultType: typeof a.analysisResult,
          resultPreview: a.analysisResult ? 
            (typeof a.analysisResult === 'string' ? 
              a.analysisResult.substring(0, 100) + '...' : 
              'Object with keys: ' + Object.keys(a.analysisResult).join(', ')
            ) : 'No result',
        }))
      }))
    });

  } catch (error) {
    Logger.error('[Debug API] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
