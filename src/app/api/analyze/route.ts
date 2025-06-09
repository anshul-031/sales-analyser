import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { MemoryStorage } from '@/lib/memory-storage';
import { geminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    Logger.info('[Analyze API] Starting analysis request');

    const { uploadIds, analysisType, customPrompt, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Upload IDs are required'
      }, { status: 400 });
    }

    if (analysisType !== 'default' && analysisType !== 'custom') {
      return NextResponse.json({
        success: false,
        error: 'Analysis type must be "default" or "custom"'
      }, { status: 400 });
    }

    if (analysisType === 'custom' && !customPrompt) {
      return NextResponse.json({
        success: false,
        error: 'Custom prompt is required for custom analysis'
      }, { status: 400 });
    }

    Logger.info('[Analyze API] Processing', uploadIds.length, 'files for analysis');

    const analyses = [];
    let successCount = 0;
    let failedCount = 0;

    for (const uploadId of uploadIds) {
      try {
        Logger.info('[Analyze API] Processing upload:', uploadId);

        // Get upload from memory
        const upload = await MemoryStorage.getUploadById(uploadId);
        if (!upload) {
          Logger.error('[Analyze API] Upload not found:', uploadId);
          failedCount++;
          continue;
        }

        if (upload.userId !== userId) {
          Logger.error('[Analyze API] Upload does not belong to user:', uploadId);
          failedCount++;
          continue;
        }

        // Create analysis record
        const analysis = await MemoryStorage.createAnalysis({
          status: 'PENDING',
          analysisType,
          customPrompt,
          userId,
          uploadId,
        });

        analyses.push(analysis);
        successCount++;

        Logger.info('[Analyze API] Created analysis record:', analysis.id);

        // Start background processing
        processAnalysisInBackground(analysis.id, upload).catch(error => {
          Logger.error('[Analyze API] Background analysis failed for', analysis.id + ':', error);
        });

        Logger.info('[Analyze API] Starting background analysis for:', analysis.id);

      } catch (error) {
        Logger.error('[Analyze API] Error processing upload', uploadId + ':', error);
        failedCount++;
      }
    }

    Logger.info('[Analyze API] Analysis requests processed. Success:', successCount, 'Failed:', failedCount);

    return NextResponse.json({
      success: true,
      message: `Analysis started for ${successCount} files`,
      analyses,
      summary: {
        total: uploadIds.length,
        successful: successCount,
        failed: failedCount
      }
    });

  } catch (error) {
    Logger.error('[Analyze API] POST request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Analysis request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const analysisId = searchParams.get('analysisId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    Logger.info('[Analyze API] Fetching analyses for user:', userId);

    let analyses;

    if (analysisId) {
      // Get specific analysis
      const analysis = await MemoryStorage.getAnalysisById(analysisId);
      if (!analysis || analysis.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Analysis not found'
        }, { status: 404 });
      }
      analyses = [analysis];
    } else {
      // Get all analyses for user with upload information
      analyses = await MemoryStorage.getAnalysesWithUploads(userId);
    }

    return NextResponse.json({
      success: true,
      analyses
    });

  } catch (error) {
    Logger.error('[Analyze API] GET request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analyses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Background processing function
async function processAnalysisInBackground(analysisId: string, upload: { filename: string; fileBuffer: Buffer; mimeType: string }) {
  try {
    Logger.info('[Analyze API] Processing analysis in background:', analysisId);

    // Update status to processing
    await MemoryStorage.updateAnalysis(analysisId, {
      status: 'PROCESSING'
    });

    Logger.info('[Analyze API] Reading audio file from memory for:', upload.filename);
    
    // Get audio buffer from memory (no file system access)
    const audioBuffer = upload.fileBuffer;
    
    // Determine MIME type from file extension
    const extension = upload.filename.toLowerCase().split('.').pop();
    let mimeType = upload.mimeType;
    
    if (!mimeType) {
      const mimeTypeMap: { [key: string]: string } = {
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        'webm': 'audio/webm'
      };
      mimeType = mimeTypeMap[extension || ''] || 'audio/mpeg';
    }

    Logger.info('[Analyze API] Starting AI analysis for:', upload.filename);

    // Get analysis from memory to check type
    const analysis = await MemoryStorage.getAnalysisById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // First transcribe the audio
    const transcription = await geminiService.transcribeAudio(audioBuffer, mimeType);
    
    // Then analyze based on type
    let analysisResult;
    if (analysis.analysisType === 'custom' && analysis.customPrompt) {
      analysisResult = await geminiService.analyzeWithCustomPrompt(transcription, analysis.customPrompt);
    } else {
      analysisResult = await geminiService.analyzeWithDefaultParameters(transcription);
    }
    
    // Add transcription to the result
    analysisResult.transcription = transcription;

    Logger.info('[Analyze API] Analysis completed successfully');

    // Clean up the uploaded file after successful analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      await MemoryStorage.cleanupCompletedAnalysis(analysisId);
      Logger.info('[Analyze API] Auto-cleanup enabled - deleted uploaded file');
    } else {
      Logger.info('[Analyze API] Auto-cleanup disabled - keeping uploaded file');
    }

    // Update analysis with results
    await MemoryStorage.updateAnalysis(analysisId, {
      analysisResult,
      status: 'COMPLETED'
    });

    Logger.info('[Analyze API] Background analysis completed for:', analysisId);

  } catch (error) {
    Logger.error('[Analyze API] Background analysis failed for', analysisId + ':', error);
    
    // Update analysis with error
    await MemoryStorage.updateAnalysis(analysisId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}