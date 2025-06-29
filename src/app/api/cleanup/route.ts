import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';

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
      
      const upload = await DatabaseStorage.getUploadById(uploadId);
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

      // Note: With the new database approach, we don't delete upload records 
      // to preserve analysis history. Files from R2 are automatically cleaned up
      // after analysis completion when AUTO_DELETE_FILES=true
      Logger.info('[Cleanup API] Upload records are preserved for analysis history');
      
      return NextResponse.json({
        success: true,
        message: 'Upload records are preserved for analysis history. File cleanup happens automatically after analysis.',
        deleted: false
      });
    } else {
      // Delete all completed analysis files for user
      Logger.info('[Cleanup API] With database storage, completed analyses are preserved for history');
      
      const analyses = await DatabaseStorage.getAnalysesByUser(userId);
      const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED');
      
      // In the new approach, we don't delete completed analyses as they provide valuable history
      return NextResponse.json({
        success: true,
        message: `Found ${completedAnalyses.length} completed analyses. These are preserved for analysis history.`,
        deletedCount: 0,
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

    const uploads = await DatabaseStorage.getUploadsByUser(userId);
    const analyses = await DatabaseStorage.getAnalysesByUser(userId);
    
    const completedAnalyses = analyses.filter(a => a.status === 'COMPLETED');
    const filesWithCompletedAnalysis = uploads.filter(upload => 
      analyses.some(analysis => analysis.uploadId === upload.id && analysis.status === 'COMPLETED')
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