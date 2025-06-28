import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { FileStorage } from '@/lib/file-storage';
import { geminiService } from '@/lib/gemini';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fflate from 'fflate';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    Logger.info('[Analyze API] Starting analysis request');

    const { uploadIds, analysisType, customPrompt, customParameters, userId } = await request.json();

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

    if (analysisType !== 'default' && analysisType !== 'custom' && analysisType !== 'parameters') {
      return NextResponse.json({
        success: false,
        error: 'Analysis type must be "default", "custom", or "parameters"'
      }, { status: 400 });
    }

    if (analysisType === 'custom' && !customPrompt) {
      return NextResponse.json({
        success: false,
        error: 'Custom prompt is required for custom analysis'
      }, { status: 400 });
    }

    if (analysisType === 'parameters' && (!customParameters || !Array.isArray(customParameters) || customParameters.length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Custom parameters are required for parameter-based analysis'
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
        const upload = await FileStorage.getUploadById(uploadId);
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
        const analysis = await FileStorage.createAnalysis({
          status: 'PENDING',
          analysisType,
          customPrompt,
          customParameters: analysisType === 'parameters' ? customParameters : undefined,
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
      const analysis = await FileStorage.getAnalysisById(analysisId);
      if (!analysis || analysis.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Analysis not found'
        }, { status: 404 });
      }
      analyses = [analysis];
    } else {
      // Get all analyses for user with upload information
      analyses = await FileStorage.getAnalysesWithUploads(userId);
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
async function processAnalysisInBackground(analysisId: string, upload: { id: string, fileUrl: string, mimeType: string, filename: string }) {
  try {
    Logger.info('[Analyze API] Processing analysis in background:', analysisId);

    // Update status to processing
    await FileStorage.updateAnalysis(analysisId, {
      status: 'PROCESSING'
    });

    Logger.info('[Analyze API] Reading audio file from R2 for:', upload.filename);
    
    const { Body } = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: upload.fileUrl,
    }));

    if (!Body) {
        throw new Error('File not found in R2');
    }

    const compressedBuffer = Buffer.from(await Body.transformToByteArray());
    const audioBuffer = Buffer.from(fflate.decompressSync(compressedBuffer));
    
    // Determine MIME type from file extension
    const extension = upload.filename.toLowerCase().split('.').pop()?.replace(/.gz$/, '');
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
    const analysis = await FileStorage.getAnalysisById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // First transcribe the audio
    const transcription = await geminiService.transcribeAudio(audioBuffer, upload.mimeType);
    
    // Then analyze based on type
    let analysisResult;
    if (analysis.analysisType === 'custom' && analysis.customPrompt) {
      analysisResult = await geminiService.analyzeWithCustomPrompt(transcription, analysis.customPrompt);
    } else if (analysis.analysisType === 'parameters' && analysis.customParameters) {
      analysisResult = await geminiService.analyzeWithCustomParameters(transcription, analysis.customParameters);
    } else {
      analysisResult = await geminiService.analyzeWithDefaultParameters(transcription);
    }
    
    // Add transcription to the result
    analysisResult.transcription = transcription;

    Logger.info('[Analyze API] Analysis completed successfully');

    // Clean up the uploaded file after successful analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      await FileStorage.cleanupCompletedAnalysis(analysisId);
      Logger.info('[Analyze API] Auto-cleanup enabled - deleted uploaded file');
    } else {
      Logger.info('[Analyze API] Auto-cleanup disabled - keeping uploaded file');
    }

    // Update analysis with results
    await FileStorage.updateAnalysis(analysisId, {
      analysisResult,
      status: 'COMPLETED'
    });

    Logger.info('[Analyze API] Background analysis completed for:', analysisId);

  } catch (error) {
    Logger.error('[Analyze API] Background analysis failed for', analysisId + ':', error);
    
    // Update analysis with error
    await FileStorage.updateAnalysis(analysisId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}