import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { FileStorage } from '@/lib/file-storage';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (uploadId) {
      // Delete specific upload
      Logger.info('[Cleanup API] Deleting specific upload:', uploadId);
      
      const upload = await FileStorage.getUploadById(uploadId);
      if (!upload) {
        return NextResponse.json({
          success: false,
          error: 'Upload not found'
        }, { status: 404 });
      }

      if (upload.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Unauthorized'
        }, { status: 403 });
      }

      const deleted = await FileStorage.deleteUploadedFile(uploadId);
      
      return NextResponse.json({
        success: true,
        message: deleted ? 'File deleted successfully' : 'File was already deleted',
        deleted
      });
    } else {
      // Delete all completed analysis files for user
      Logger.info('[Cleanup API] Cleaning up completed analyses for user:', userId);
      
      const analyses = await FileStorage.getAnalysesByUser(userId);
      const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED');
      
      let deletedCount = 0;
      for (const analysis of completedAnalyses) {
        try {
          await FileStorage.cleanupCompletedAnalysis(analysis.id);
          deletedCount++;
        } catch (error) {
          Logger.warn('[Cleanup API] Failed to cleanup analysis:', analysis.id, error);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deletedCount} completed analysis files`,
        deletedCount,
        totalCompleted: completedAnalyses.length
      });
    }

  } catch (error) {
    Logger.error('[Cleanup API] Cleanup request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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

    Logger.info('[Cleanup API] Getting cleanup status for user:', userId);

    const uploads = await FileStorage.getUploadsWithAnalyses(userId);
    const analyses = await FileStorage.getAnalysesByUser(userId);
    
    const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED');
    const filesWithCompletedAnalysis = uploads.filter(upload => 
      upload.analyses.some(analysis => analysis.status === 'COMPLETED')
    );

    return NextResponse.json({
      success: true,
      status: {
        totalUploads: uploads.length,
        totalAnalyses: analyses.length,
        completedAnalyses: completedAnalyses.length,
        filesEligibleForCleanup: filesWithCompletedAnalysis.length,
        autoDeleteEnabled: process.env.AUTO_DELETE_FILES === 'true'
      }
    });

  } catch (error) {
    Logger.error('[Cleanup API] Status request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get cleanup status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}