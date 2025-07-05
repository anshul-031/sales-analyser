import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { EnhancedDatabaseStorage } from '@/lib/db-enhanced-storage';
import { geminiService } from '@/lib/gemini';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/analyze:
 *   post:
 *     tags: [Analysis]
 *     summary: Analyze audio files
 *     description: Perform AI-powered analysis on uploaded audio files including transcription, sentiment analysis, and custom parameter extraction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyzeResponse'
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Upload not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Analysis processing error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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

    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { uploadIds, analysisType, customPrompt, customParameters } = await request.json();

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Upload IDs are required'
      }, { status: 400 });
    }

    // Filter out null, undefined, and empty string values from uploadIds
    const validUploadIds = uploadIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validUploadIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid upload IDs provided'
      }, { status: 400 });
    }

    if (validUploadIds.length !== uploadIds.length) {
      Logger.warn('[Analyze API] Filtered out invalid upload IDs:', uploadIds.length - validUploadIds.length, 'invalid IDs');
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

    Logger.info('[Analyze API] Processing', validUploadIds.length, 'files for analysis');

    const analyses = [];
    let successCount = 0;
    let failedCount = 0;

    for (const uploadId of validUploadIds) {
      try {
        Logger.info('[Analyze API] Processing upload:', uploadId);

        // Additional validation for upload ID
        if (!uploadId || typeof uploadId !== 'string' || uploadId.trim().length === 0) {
          Logger.error('[Analyze API] Invalid upload ID:', uploadId);
          failedCount++;
          continue;
        }

        // Get upload from database using enhanced storage
        const upload = await EnhancedDatabaseStorage.getUploadById(uploadId);
        if (!upload) {
          Logger.error('[Analyze API] Upload not found:', uploadId);
          failedCount++;
          continue;
        }

        if (upload.userId !== user.id) {
          Logger.error('[Analyze API] Upload does not belong to user:', uploadId);
          failedCount++;
          continue;
        }

        // Create analysis record using enhanced storage
        const analysis = await EnhancedDatabaseStorage.createAnalysis({
          status: 'PENDING',
          analysisType: analysisType.toUpperCase() as 'DEFAULT' | 'CUSTOM' | 'PARAMETERS',
          customPrompt,
          customParameters: analysisType === 'parameters' ? customParameters : undefined,
          userId: user.id,
          uploadId,
        });

        analyses.push(analysis);
        successCount++;

        Logger.info('[Analyze API] Created analysis record:', analysis.id);

        // Start background processing
        processAnalysisInBackground(analysis.id, {
          id: upload.id,
          fileUrl: upload.fileUrl,
          mimeType: upload.mimeType,
          filename: upload.filename
        }).catch(error => {
          Logger.error('[Analyze API] Background analysis failed for', analysis.id + ':', error);
        });

        Logger.info('[Analyze API] Starting background analysis for:', analysis.id);

      } catch (error) {
        Logger.error('[Analyze API] Error processing upload', uploadId + ':', error);
        failedCount++;
      }
    }

    Logger.info('[Analyze API] Analysis requests processed. Success:', successCount, 'Failed:', failedCount);

    // Import serialization utility
    const { serializeAnalyses } = await import('../../../lib/serialization');

    return NextResponse.json({
      success: true,
      message: `Analysis started for ${successCount} files`,
      analyses: serializeAnalyses(analyses),
      summary: {
        total: validUploadIds.length,
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
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');

    Logger.info('[Analyze API] Fetching analyses for user:', user.id);

    let analyses;

    if (analysisId) {
      // Get specific analysis using enhanced storage
      const analysis = await EnhancedDatabaseStorage.getAnalysisById(analysisId);
      if (!analysis || analysis.userId !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Analysis not found'
        }, { status: 404 });
      }
      analyses = [analysis];
    } else {
      // Get all analyses for user using enhanced storage
      analyses = await EnhancedDatabaseStorage.getAnalysesByUser(user.id);
    }

    // Convert BigInt to string for JSON serialization
    const serializedAnalyses = analyses.map((analysis: any) => ({
      ...analysis,
      upload: analysis.upload ? {
        ...analysis.upload,
        fileSize: analysis.upload.fileSize.toString()
      } : analysis.upload
    }));

    return NextResponse.json({
      success: true,
      analyses: serializedAnalyses
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
  const analysisStartTime = Date.now();
  try {
    Logger.info('[Analyze API] Processing analysis in background:', analysisId);

    // Update status to processing using enhanced storage with retry
    await EnhancedDatabaseStorage.updateAnalysis(analysisId, {
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

    const audioBuffer = Buffer.from(await Body.transformToByteArray());
    
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

    // Get analysis from database to check type
    const analysis = await EnhancedDatabaseStorage.getAnalysisById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // First transcribe the audio
    const transcription = await geminiService.transcribeAudio(audioBuffer, upload.mimeType);
    
    // Then analyze based on type
    let analysisResult;
    if (analysis.analysisType === 'CUSTOM' && analysis.customPrompt) {
      analysisResult = await geminiService.analyzeWithCustomPrompt(transcription, analysis.customPrompt);
    } else if (analysis.analysisType === 'PARAMETERS' && analysis.customParameters) {
      // Type assertion for JSON to expected parameter type
      const parameters = analysis.customParameters as { id: string; name: string; description: string; prompt: string; enabled: boolean; }[];
      analysisResult = await geminiService.analyzeWithCustomParameters(transcription, parameters);
    } else {
      analysisResult = await geminiService.analyzeWithDefaultParameters(transcription);
    }
    
    // Add transcription to the result
    analysisResult.transcription = transcription;

    Logger.info('[Analyze API] Analysis completed successfully');
    
    const analysisEndTime = Date.now();
    const analysisDuration = analysisEndTime - analysisStartTime;

    // Update analysis with results using enhanced storage with retry
    await EnhancedDatabaseStorage.updateAnalysis(analysisId, {
      analysisResult,
      status: 'COMPLETED',
      analysisDuration,
      transcription,
    });

    // Extract and store insights
    await extractAndStoreInsights(analysisId, analysisResult);

    // Clean up the uploaded file after successful analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      await cleanupUploadedFile(upload.id);
      Logger.info('[Analyze API] Auto-cleanup enabled - deleted uploaded file');
    } else {
      Logger.info('[Analyze API] Auto-cleanup disabled - keeping uploaded file');
    }

    Logger.info('[Analyze API] Background analysis completed for:', analysisId);

  } catch (error) {
    Logger.error('[Analyze API] Background analysis failed for', analysisId + ':', error);
    
    const analysisEndTime = Date.now();
    const analysisDuration = analysisEndTime - analysisStartTime;
    
    // Update analysis with error using enhanced storage with retry
    await EnhancedDatabaseStorage.updateAnalysis(analysisId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      analysisDuration,
    });

    // Clean up the uploaded file after failed analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      await cleanupUploadedFile(upload.id);
      Logger.info('[Analyze API] Auto-cleanup enabled - deleted uploaded file after failure');
    } else {
      Logger.info('[Analyze API] Auto-cleanup disabled - keeping uploaded file after failure');
    }
  }
}

// Helper function to extract and store insights from analysis results
async function extractAndStoreInsights(analysisId: string, analysisResult: any) {
  try {
    const insights = [];

    // Extract different types of insights based on the analysis result structure
    if (analysisResult.summary) {
      insights.push({
        analysisId,
        category: 'summary',
        key: 'call_summary',
        value: analysisResult.summary,
      });
    }

    if (analysisResult.sentiment) {
      insights.push({
        analysisId,
        category: 'sentiment',
        key: 'overall_sentiment',
        value: analysisResult.sentiment,
        confidence: analysisResult.sentimentConfidence,
      });
    }

    if (analysisResult.keywords) {
      insights.push({
        analysisId,
        category: 'keywords',
        key: 'key_topics',
        value: analysisResult.keywords,
      });
    }

    if (analysisResult.actionItems) {
      insights.push({
        analysisId,
        category: 'action_items',
        key: 'follow_up_actions',
        value: analysisResult.actionItems,
      });
    }

    if (analysisResult.participants) {
      insights.push({
        analysisId,
        category: 'participants',
        key: 'participant_analysis',
        value: analysisResult.participants,
      });
    }

    if (analysisResult.emotions) {
      insights.push({
        analysisId,
        category: 'emotions',
        key: 'emotional_analysis',
        value: analysisResult.emotions,
      });
    }

    if (analysisResult.topics) {
      insights.push({
        analysisId,
        category: 'topics',
        key: 'conversation_topics',
        value: analysisResult.topics,
      });
    }

    // Store insights in batch
    if (insights.length > 0) {
      await DatabaseStorage.createMultipleInsights(insights);
      Logger.info('[Analyze API] Stored', insights.length, 'insights for analysis:', analysisId);
    }

    // Extract and store call metrics if available
    if (analysisResult.metrics) {
      await DatabaseStorage.createCallMetrics({
        analysisId,
        duration: analysisResult.metrics.duration,
        participantCount: analysisResult.metrics.participantCount,
        wordCount: analysisResult.metrics.wordCount,
        sentimentScore: analysisResult.metrics.sentimentScore,
        energyLevel: analysisResult.metrics.energyLevel,
        talkRatio: analysisResult.metrics.talkRatio,
        interruptionCount: analysisResult.metrics.interruptionCount,
        pauseCount: analysisResult.metrics.pauseCount,
        speakingPace: analysisResult.metrics.speakingPace,
      });
      Logger.info('[Analyze API] Stored call metrics for analysis:', analysisId);
    }

  } catch (error) {
    Logger.error('[Analyze API] Error extracting insights:', error);
  }
}

// Helper function to cleanup uploaded files
async function cleanupUploadedFile(uploadId: string) {
  try {
    const upload = await DatabaseStorage.getUploadById(uploadId);
    if (!upload) {
      Logger.warn('[Analyze API] Upload not found for cleanup:', uploadId);
      return;
    }

    // Delete the object from R2 storage only
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: upload.fileUrl,
      }));
      Logger.info('[Analyze API] Deleted file from R2:', upload.fileUrl);
    } catch (r2Error) {
      Logger.error('[Analyze API] Error deleting file from R2:', r2Error);
    }

    // Keep the upload record in database for analysis history
    // Only mark it as file deleted or update metadata if needed
    Logger.info('[Analyze API] Kept upload record for analysis history:', uploadId);

  } catch (error) {
    Logger.error('[Analyze API] Error during file cleanup:', error);
  }
}