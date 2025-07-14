import { NextRequest, NextResponse } from 'next/server';
import { Logger, AdaptiveTimeout } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { geminiService } from '@/lib/gemini';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAuthenticatedUser } from '@/lib/auth';
import { LoggingConfig, ProductionMonitoring, ErrorCategories, ErrorCategory } from '@/lib/logging-config';
import { analysisMonitor } from '@/lib/analysis-monitor';
import { AnalysisStatus } from '@/types/enums';

// Ensure monitoring is started
analysisMonitor.startMonitoring();

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

// Enhanced timeout and retry mechanism for Gemini API calls
const withEnhancedTimeout = <T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  operationName: string,
  requestId: string = 'unknown'
): Promise<T> => {
  // Use adaptive timeout for long-running operations
  const maxTimeoutMs = Math.max(timeoutMs * 3, LoggingConfig.timeouts.longRunningTimeout);
  
  Logger.analysis(`Starting ${operationName} with adaptive timeout (base: ${timeoutMs}ms, max: ${maxTimeoutMs}ms)`);
  
  return AdaptiveTimeout.createExtendableTimeout(
    promise,
    timeoutMs,
    maxTimeoutMs,
    operationName,
    (elapsed) => {
      Logger.warn(`[Analyze API] [${requestId}] ${operationName} taking longer than expected - ${elapsed}ms elapsed`);
    }
  );
};

// Enhanced timeout specifically for Gemini API calls with progressive logging
const withGeminiTimeout = <T>(
  promise: Promise<T>,
  operationName: string,
  requestId: string = 'unknown'
): Promise<T> => {
  const baseTimeout = LoggingConfig.timeouts.geminiApiTimeout;
  
  Logger.analysis(`Starting ${operationName} with progressive timeout: ${baseTimeout}ms`);
  
  return AdaptiveTimeout.createProgressiveTimeout(
    promise,
    baseTimeout,
    operationName,
    30000 // Progress logging every 30 seconds
  );
};

// Add heartbeat logging for long-running operations
const createHeartbeat = (requestId: string, operationName: string, intervalMs: number = 30000) => {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    Logger.info(`[Analyze API] [${requestId}] ${operationName} heartbeat - elapsed: ${elapsed}ms`);
  }, intervalMs);
  
  return () => clearInterval(interval);
};

// Add monitoring function to track system health
const logSystemHealth = (requestId: string) => {
  Logger.info(`[Analyze API] [${requestId}] System Health Check:`, {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    r2BucketName: process.env.R2_BUCKET_NAME ? 'configured' : 'missing',
    hasApiKeys: process.env.GOOGLE_GEMINI_API_KEYS ? 'configured' : 'missing',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17',
    autoDeleteFiles: process.env.AUTO_DELETE_FILES || 'undefined'
  });
};

// Get timeout values from environment or use defaults
const getTimeouts = () => LoggingConfig.timeouts;

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    Logger.info(`[Analyze API] [${requestId}] Starting analysis request`);

    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      Logger.warn(`[Analyze API] [${requestId}] Authentication failed`);
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    Logger.info(`[Analyze API] [${requestId}] User authenticated:`, user.id);

    const { uploadIds, analysisType, customPrompt, customParameters, selectedActionItemTypes } = await request.json();
    Logger.info(`[Analyze API] [${requestId}] Request payload:`, {
      uploadIds: uploadIds?.length || 0,
      analysisType,
      hasCustomPrompt: !!customPrompt,
      customParametersCount: customParameters?.length || 0,
      selectedActionItemTypesCount: selectedActionItemTypes?.length || 0
    });

    if (!uploadIds || !Array.isArray(uploadIds) || uploadIds.length === 0) {
      Logger.warn(`[Analyze API] [${requestId}] Invalid upload IDs provided:`, uploadIds);
      return NextResponse.json({
        success: false,
        error: 'Upload IDs are required'
      }, { status: 400 });
    }

    // Filter out null, undefined, and empty string values from uploadIds
    const validUploadIds = uploadIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    
    if (validUploadIds.length === 0) {
      Logger.warn(`[Analyze API] [${requestId}] No valid upload IDs after filtering:`, uploadIds);
      return NextResponse.json({
        success: false,
        error: 'No valid upload IDs provided'
      }, { status: 400 });
    }

    if (validUploadIds.length !== uploadIds.length) {
      Logger.warn(`[Analyze API] [${requestId}] Filtered out invalid upload IDs:`, uploadIds.length - validUploadIds.length, 'invalid IDs');
    }

    if (analysisType !== 'default' && analysisType !== 'custom' && analysisType !== 'parameters') {
      Logger.warn(`[Analyze API] [${requestId}] Invalid analysis type:`, analysisType);
      return NextResponse.json({
        success: false,
        error: 'Analysis type must be "default", "custom", or "parameters"'
      }, { status: 400 });
    }

    if (analysisType === 'custom' && !customPrompt) {
      Logger.warn(`[Analyze API] [${requestId}] Custom prompt missing for custom analysis`);
      return NextResponse.json({
        success: false,
        error: 'Custom prompt is required for custom analysis'
      }, { status: 400 });
    }

    if (analysisType === 'parameters' && (!customParameters || !Array.isArray(customParameters) || customParameters.length === 0)) {
      Logger.warn(`[Analyze API] [${requestId}] Custom parameters missing for parameter analysis`);
      return NextResponse.json({
        success: false,
        error: 'Custom parameters are required for parameter-based analysis'
      }, { status: 400 });
    }

    Logger.info(`[Analyze API] [${requestId}] Processing`, validUploadIds.length, 'files for analysis');

    const analyses = [];
    let successCount = 0;
    let failedCount = 0;

    for (const uploadId of validUploadIds) {
      const uploadStartTime = Date.now();
      try {
        Logger.info(`[Analyze API] [${requestId}] Processing upload:`, uploadId);

        // Additional validation for upload ID
        if (!uploadId || typeof uploadId !== 'string' || uploadId.trim().length === 0) {
          Logger.error(`[Analyze API] [${requestId}] Invalid upload ID:`, uploadId);
          failedCount++;
          continue;
        }

        // Get upload from database using enhanced storage
        Logger.info(`[Analyze API] [${requestId}] Fetching upload from database:`, uploadId);
        const upload = await DatabaseStorage.getUploadById(uploadId);
        if (!upload) {
          Logger.error(`[Analyze API] [${requestId}] Upload not found in database:`, uploadId);
          failedCount++;
          continue;
        }

        if (upload.userId !== user.id) {
          Logger.error(`[Analyze API] [${requestId}] Upload does not belong to user:`, uploadId, 'expected user:', user.id, 'actual user:', upload.userId);
          failedCount++;
          continue;
        }

        Logger.info(`[Analyze API] [${requestId}] Upload validated:`, {
          uploadId,
          filename: upload.filename,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType
        });

        const analysis = await DatabaseStorage.createAnalysis({
          status: 'PENDING',
          analysisType: analysisType.toUpperCase() as 'DEFAULT' | 'CUSTOM' | 'PARAMETERS',
          customPrompt,
          customParameters: analysisType === 'parameters' ? customParameters : undefined,
          userId: user.id,
          uploadId,
        });

        analyses.push(analysis);
        successCount++;

        // Register analysis for monitoring
        analysisMonitor.registerAnalysis({
          id: analysis.id,
          userId: user.id,
          filename: upload.filename,
          analysisType: analysis.analysisType,
          requestId
        });

        Logger.info(`[Analyze API] [${requestId}] Created analysis record:`, {
          analysisId: analysis.id,
          uploadId,
          analysisType: analysis.analysisType,
          duration: Date.now() - uploadStartTime + 'ms'
        });

        // Start background processing
        processAnalysisInBackground(analysis.id, {
          id: upload.id,
          fileUrl: upload.fileUrl,
          mimeType: upload.mimeType,
          filename: upload.filename
        }, requestId, user.id, selectedActionItemTypes).catch(error => {
          Logger.error(`[Analyze API] [${requestId}] Background analysis failed for`, analysis.id + ':', error);
        });

        Logger.info(`[Analyze API] [${requestId}] Starting background analysis for:`, analysis.id);

      } catch (error) {
        Logger.error(`[Analyze API] [${requestId}] Error processing upload`, uploadId + ':', error);
        failedCount++;
      }
    }

    Logger.info(`[Analyze API] [${requestId}] Analysis requests processed:`, {
      total: validUploadIds.length,
      successful: successCount,
      failed: failedCount,
      duration: Date.now() - requestStartTime + 'ms'
    });

    // Import serialization utility
    const { serializeAnalyses } = await import('../../../lib/serialization');

    const response = {
      success: true,
      message: `Analysis started for ${successCount} files`,
      analyses: serializeAnalyses(analyses),
      summary: {
        total: validUploadIds.length,
        successful: successCount,
        failed: failedCount
      }
    };

    Logger.info(`[Analyze API] [${requestId}] Returning response:`, {
      success: true,
      analysesCount: analyses.length,
      successCount,
      failedCount
    });

    return NextResponse.json(response);

  } catch (error) {
    Logger.error(`[Analyze API] [${requestId}] POST request failed:`, error);
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Analyze API] [${requestId}] Error details:`, errorDetails);
    
    return NextResponse.json({
      success: false,
      error: 'Analysis request failed',
      details: errorDetails
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = `get_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const requestStartTime = Date.now();
  
  try {
    Logger.info(`[Analyze API] [${requestId}] GET request received`);
    
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      Logger.warn(`[Analyze API] [${requestId}] Authentication failed for GET request`);
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');

    Logger.info(`[Analyze API] [${requestId}] Fetching analyses for user:`, {
      userId: user.id,
      specificAnalysis: analysisId || 'all'
    });

    let analyses;

    if (analysisId) {
      Logger.info(`[Analyze API] [${requestId}] Fetching specific analysis:`, analysisId);
      // Get specific analysis using enhanced storage
      const analysis = await DatabaseStorage.getAnalysisById(analysisId);
      if (!analysis || analysis.userId !== user.id) {
        Logger.warn(`[Analyze API] [${requestId}] Analysis not found or access denied:`, {
          analysisId,
          found: !!analysis,
          userId: user.id,
          analysisUserId: analysis?.userId
        });
        return NextResponse.json({
          success: false,
          error: 'Analysis not found'
        }, { status: 404 });
      }
      analyses = [analysis];
    } else {
      Logger.info(`[Analyze API] [${requestId}] Fetching all analyses for user:`, user.id);
      // Get all analyses for user using enhanced storage
      analyses = await DatabaseStorage.getAnalysesByUser(user.id);
    }

    Logger.info(`[Analyze API] [${requestId}] Found analyses:`, {
      count: analyses.length,
      duration: Date.now() - requestStartTime + 'ms'
    });

    // Convert BigInt to string for JSON serialization
    const serializedAnalyses = analyses.map((analysis: any) => ({
      ...analysis,
      upload: analysis.upload ? {
        ...analysis.upload,
        fileSize: analysis.upload.fileSize.toString()
      } : analysis.upload
    }));

    Logger.info(`[Analyze API] [${requestId}] Returning serialized analyses:`, {
      count: serializedAnalyses.length,
      totalDuration: Date.now() - requestStartTime + 'ms'
    });

    return NextResponse.json({
      success: true,
      analyses: serializedAnalyses
    });

  } catch (error) {
    Logger.error(`[Analyze API] [${requestId}] GET request failed:`, error);
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`[Analyze API] [${requestId}] Error details:`, errorDetails);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analyses',
      details: errorDetails
    }, { status: 500 });
  }
}

// Background processing function
async function processAnalysisInBackground(analysisId: string, upload: { id: string, fileUrl: string, mimeType: string, filename: string }, requestId: string = 'unknown', userId: string, selectedActionItemTypes?: string[]) {
  const analysisStartTime = Date.now();
  
  // Log system health at start of processing
  logSystemHealth(requestId);
  
  // Create heartbeat logger for long-running operation
  const heartbeat = createHeartbeat(requestId, 'Background Analysis', 30000); // 30 seconds interval
  
  try {
    Logger.info(`[Analyze API] [${requestId}] Processing analysis in background:`, analysisId);

    // Update status to processing using enhanced storage with retry
    Logger.info(`[Analyze API] [${requestId}] Updating analysis status to PROCESSING:`, analysisId);
    await DatabaseStorage.updateAnalysis(analysisId, {
      status: 'PROCESSING'
    });
    
    // Update monitoring stage
    analysisMonitor.updateAnalysisStage(analysisId, AnalysisStatus.PROCESSING);

    Logger.info(`[Analyze API] [${requestId}] Reading audio file from R2:`, {
      filename: upload.filename,
      fileUrl: upload.fileUrl,
      bucket: process.env.R2_BUCKET_NAME
    });
    
    const { Body } = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: upload.fileUrl,
    }));

    if (!Body) {
        throw new Error('File not found in R2');
    }

    const audioBuffer = Buffer.from(await Body.transformToByteArray());
    Logger.info(`[Analyze API] [${requestId}] Audio file loaded:`, {
      filename: upload.filename,
      bufferSize: audioBuffer.length,
      originalSize: upload.fileUrl
    });
    
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
      Logger.info(`[Analyze API] [${requestId}] Determined MIME type:`, mimeType, 'from extension:', extension);
    }

    Logger.info(`[Analyze API] [${requestId}] Starting AI analysis:`, {
      filename: upload.filename,
      mimeType,
      analysisId
    });

    // Get analysis from database to check type
    const analysis = await DatabaseStorage.getAnalysisById(analysisId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    Logger.info(`[Analyze API] [${requestId}] Analysis configuration:`, {
      analysisType: analysis.analysisType,
      hasCustomPrompt: !!analysis.customPrompt,
      customParametersCount: analysis.customParameters ? (analysis.customParameters as any[]).length : 0
    });

    // First transcribe the audio
    Logger.info(`[Analyze API] [${requestId}] Starting transcription:`, {
      filename: upload.filename,
      audioSize: audioBuffer.length,
      mimeType
    });
    
    // Update monitoring stage
    analysisMonitor.updateAnalysisStage(analysisId, AnalysisStatus.TRANSCRIBING);
    
    const transcriptionStartTime = Date.now();
    const transcriptionHeartbeat = createHeartbeat(requestId, 'Transcription');
    
    let transcription: string;
    let analysisResult: any;
    
    try {
      transcription = await withGeminiTimeout(
        geminiService.transcribeAudio(audioBuffer, upload.mimeType),
        'Transcription',
        requestId
      );
      transcriptionHeartbeat();
      
      const transcriptionDuration = Date.now() - transcriptionStartTime;
      
      Logger.info(`[Analyze API] [${requestId}] Transcription completed:`, {
        filename: upload.filename,
        transcriptionLength: transcription.length,
        duration: transcriptionDuration + 'ms'
      });
      
      // Then analyze based on type
      const analysisStartTime = Date.now();
      const analysisHeartbeat = createHeartbeat(requestId, 'Analysis');
      
      // Update monitoring stage
      analysisMonitor.updateAnalysisStage(analysisId, AnalysisStatus.ANALYZING);
      
      try {
        if (analysis.analysisType === 'CUSTOM' && analysis.customPrompt) {
          Logger.info(`[Analyze API] [${requestId}] Starting custom analysis with prompt`);
          analysisResult = await withGeminiTimeout(
            geminiService.analyzeWithCustomPrompt(transcription, analysis.customPrompt, userId, selectedActionItemTypes),
            'Custom Analysis',
            requestId
          );
        } else if (analysis.analysisType === 'PARAMETERS' && analysis.customParameters) {
          Logger.info(`[Analyze API] [${requestId}] Starting parameter-based analysis with`, (analysis.customParameters as any[]).length, 'parameters');
          // Type assertion for JSON to expected parameter type
          const parameters = analysis.customParameters as { id: string; name: string; description: string; prompt: string; enabled: boolean; }[];
          analysisResult = await withGeminiTimeout(
            geminiService.analyzeWithCustomParameters(transcription, parameters, userId, selectedActionItemTypes),
            'Parameter Analysis',
            requestId
          );
        } else {
          Logger.info(`[Analyze API] [${requestId}] Starting default analysis`);
          analysisResult = await withGeminiTimeout(
            geminiService.analyzeWithDefaultParameters(transcription, userId, selectedActionItemTypes),
            'Default Analysis',
            requestId
          );
        }
        
        analysisHeartbeat();
        
        const analysisProcessingDuration = Date.now() - analysisStartTime;
        Logger.info(`[Analyze API] [${requestId}] Analysis processing completed:`, {
          filename: upload.filename,
          analysisType: analysis.analysisType,
          duration: analysisProcessingDuration + 'ms'
        });
        
        // Add transcription to the result
        analysisResult.transcription = transcription;

        Logger.info(`[Analyze API] [${requestId}] Analysis completed successfully:`, {
          filename: upload.filename,
          analysisId,
          totalDuration: Date.now() - analysisStartTime + 'ms'
        });
        
      } catch (analysisError) {
        analysisHeartbeat();
        throw analysisError;
      }
      
    } catch (transcriptionError) {
      transcriptionHeartbeat();
      throw transcriptionError;
    }
    
    const analysisEndTime = Date.now();
    const analysisDuration = analysisEndTime - analysisStartTime;

    Logger.info(`[Analyze API] [${requestId}] Updating analysis with results:`, {
      analysisId,
      analysisDuration: analysisDuration + 'ms',
      transcriptionLength: transcription.length,
      hasResults: !!analysisResult
    });

    // Update analysis with results using enhanced storage with retry
    await DatabaseStorage.updateAnalysis(analysisId, {
      analysisResult,
      status: 'COMPLETED',
      analysisDuration,
      transcription,
    });

    // Update monitoring - analysis completed
    analysisMonitor.completeAnalysis(analysisId, AnalysisStatus.COMPLETED);

    Logger.info(`[Analyze API] [${requestId}] Extracting and storing insights:`, analysisId);
    // Extract and store insights
    await extractAndStoreInsights(analysisId, analysisResult, requestId);

    // Clean up the uploaded file after successful analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      Logger.info(`[Analyze API] [${requestId}] Auto-cleanup enabled - deleting uploaded file:`, upload.filename);
      await cleanupUploadedFile(upload.id, requestId);
    } else {
      Logger.info(`[Analyze API] [${requestId}] Auto-cleanup disabled - keeping uploaded file:`, upload.filename);
    }

    Logger.info(`[Analyze API] [${requestId}] Background analysis completed successfully:`, {
      analysisId,
      filename: upload.filename,
      totalDuration: analysisDuration + 'ms'
    });

    // Log successful operation metrics
    ProductionMonitoring.logOperationMetrics(
      'background_analysis',
      analysisDuration,
      true,
      {
        filename: upload.filename,
        analysisId,
        analysisType: analysis?.analysisType,
        transcriptionLength: transcription?.length
      }
    );

  } catch (error) {
    Logger.error(`[Analyze API] [${requestId}] Background analysis failed for`, analysisId + ':', error);
    
    const analysisEndTime = Date.now();
    const analysisDuration = analysisEndTime - analysisStartTime;
    
    // Enhanced error categorization and logging
    let errorCategory: ErrorCategory = ErrorCategories.UNKNOWN;
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      const errorMsgLower = error.message.toLowerCase();
      
      if (errorMsgLower.includes('timeout') || errorMsgLower.includes('timed out')) {
        errorCategory = ErrorCategories.TIMEOUT;
        Logger.production('error', `Analysis timed out after ${analysisDuration}ms`, {
          filename: upload.filename,
          analysisId,
          duration: analysisDuration
        });
      } else if (errorMsgLower.includes('quota_exceeded') || errorMsgLower.includes('429') || errorMsgLower.includes('too many requests')) {
        errorCategory = ErrorCategories.RATE_LIMIT;
        Logger.production('error', `Rate limit exceeded`, {
          filename: upload.filename,
          analysisId
        });
      } else if (errorMsgLower.includes('api key') || errorMsgLower.includes('authentication') || errorMsgLower.includes('permission_denied')) {
        errorCategory = ErrorCategories.AUTH_ERROR;
        Logger.production('error', `Authentication error`, {
          filename: upload.filename,
          analysisId
        });
      } else if (errorMsgLower.includes('file not found') || errorMsgLower.includes('r2')) {
        errorCategory = ErrorCategories.FILE_ERROR;
        Logger.production('error', `File access error`, {
          filename: upload.filename,
          analysisId,
          fileUrl: upload.fileUrl
        });
      } else if (errorMsgLower.includes('json') || errorMsgLower.includes('parse')) {
        errorCategory = ErrorCategories.PARSING_ERROR;
        Logger.production('error', `Response parsing error`, {
          filename: upload.filename,
          analysisId
        });
      } else if (errorMsgLower.includes('network') || errorMsgLower.includes('connection')) {
        errorCategory = ErrorCategories.NETWORK_ERROR;
        Logger.production('error', `Network connectivity error`, {
          filename: upload.filename,
          analysisId
        });
      } else {
        errorCategory = ErrorCategories.API_ERROR;
        Logger.production('error', `API error`, {
          filename: upload.filename,
          analysisId,
          errorMessage: error.message
        });
      }
      
      // Use the new categorized error logging
      ProductionMonitoring.logCategorizedError(errorCategory, error, {
        filename: upload.filename,
        analysisId,
        analysisDuration,
        operation: 'background_analysis'
      });
    }
    
    Logger.error(`[Analyze API] [${requestId}] Error details:`, {
      filename: upload.filename,
      analysisId,
      errorCategory,
      errorMessage,
      analysisDuration: analysisDuration + 'ms',
      stackTrace: error instanceof Error ? error.stack : 'No stack trace available'
    });
    
    // Log operation metrics
    ProductionMonitoring.logOperationMetrics(
      'background_analysis',
      analysisDuration,
      false,
      {
        filename: upload.filename,
        analysisId,
        errorCategory,
        errorMessage
      }
    );
    
    // Update analysis with error using enhanced storage with retry
    await DatabaseStorage.updateAnalysis(analysisId, {
      status: 'FAILED',
      errorMessage: `${errorCategory}: ${errorMessage}`,
      analysisDuration,
    });

    // Update monitoring - analysis failed
    analysisMonitor.completeAnalysis(analysisId, AnalysisStatus.FAILED);

    // Clean up the uploaded file after failed analysis (if enabled)
    const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
    if (autoDeleteFiles) {
      Logger.info(`[Analyze API] [${requestId}] Auto-cleanup enabled - deleting uploaded file after failure:`, upload.filename);
      await cleanupUploadedFile(upload.id, requestId);
    } else {
      Logger.info(`[Analyze API] [${requestId}] Auto-cleanup disabled - keeping uploaded file after failure:`, upload.filename);
    }
  } finally {
    // Clear heartbeat interval
    heartbeat();
  }
}

// Helper function to extract and store insights from analysis results
async function extractAndStoreInsights(analysisId: string, analysisResult: any, requestId: string = 'unknown') {
  try {
    Logger.info(`[Analyze API] [${requestId}] Extracting insights for analysis:`, analysisId);
    
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
      Logger.info(`[Analyze API] [${requestId}] Stored`, insights.length, 'insights for analysis:', analysisId);
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
      Logger.info(`[Analyze API] [${requestId}] Stored call metrics for analysis:`, analysisId);
    }

    // Extract and store action items if available
    if (analysisResult.actionItems && Array.isArray(analysisResult.actionItems)) {
      try {
        const actionItemsToCreate = analysisResult.actionItems.map((item: any) => ({
          analysisId,
          title: item.title || item.action || item.task || item.description || 'Action Item',
          description: item.description || item.details || item.context || '',
          priority: (item.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(item.priority.toUpperCase())) 
            ? item.priority.toUpperCase() 
            : 'MEDIUM',
          deadline: item.deadline ? new Date(item.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
          comments: item.comments || item.notes || '',
          typeId: item.typeId || null, // Include typeId if provided by AI
        }));

        if (actionItemsToCreate.length > 0) {
          await DatabaseStorage.createMultipleActionItems(actionItemsToCreate);
          Logger.info(`[Analyze API] [${requestId}] Stored ${actionItemsToCreate.length} action items for analysis:`, analysisId);
        }
      } catch (actionItemError) {
        Logger.error(`[Analyze API] [${requestId}] Error storing action items:`, actionItemError);
      }
    }

    // Also extract action items from analysis result if they're in a different format
    if (analysisResult.follow_up_actions || analysisResult.next_steps || analysisResult.tasks) {
      try {
        const actionItemsSource = analysisResult.follow_up_actions || analysisResult.next_steps || analysisResult.tasks;
        const actionItemsToCreate: Array<{
          analysisId: string;
          title: string;
          description: string;
          priority: 'LOW' | 'MEDIUM' | 'HIGH';
          deadline: Date;
          comments: string;
          typeId?: string | null;
        }> = [];

        if (Array.isArray(actionItemsSource)) {
          actionItemsSource.forEach((item: any, index: number) => {
            if (typeof item === 'string') {
              actionItemsToCreate.push({
                analysisId,
                title: item.substring(0, 100), // Limit title length
                description: item,
                priority: 'MEDIUM',
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
                comments: '',
                typeId: null, // String items don't have typeId
              });
            } else if (typeof item === 'object' && item !== null) {
              actionItemsToCreate.push({
                analysisId,
                title: item.title || item.action || item.task || `Action Item ${index + 1}`,
                description: item.description || item.details || item.action || '',
                priority: (item.priority && ['LOW', 'MEDIUM', 'HIGH'].includes(item.priority.toUpperCase())) 
                  ? item.priority.toUpperCase() 
                  : 'MEDIUM',
                deadline: item.deadline ? new Date(item.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000),
                comments: item.comments || item.notes || '',
                typeId: item.typeId || null, // Include typeId if provided
              });
            }
          });
        }

        if (actionItemsToCreate.length > 0) {
          await DatabaseStorage.createMultipleActionItems(actionItemsToCreate);
          Logger.info(`[Analyze API] [${requestId}] Stored ${actionItemsToCreate.length} additional action items for analysis:`, analysisId);
        }
      } catch (actionItemError) {
        Logger.error(`[Analyze API] [${requestId}] Error storing additional action items:`, actionItemError);
      }
    }
  } catch (error) {
    Logger.error(`[Analyze API] [${requestId}] Error extracting insights:`, error);
  }
}

// Helper function to cleanup uploaded files
async function cleanupUploadedFile(uploadId: string, requestId: string = 'unknown') {
  try {
    Logger.info(`[Analyze API] [${requestId}] Starting file cleanup for upload:`, uploadId);
    
    const upload = await DatabaseStorage.getUploadById(uploadId);
    if (!upload) {
      Logger.warn(`[Analyze API] [${requestId}] Upload not found for cleanup:`, uploadId);
      return;
    }

    Logger.info(`[Analyze API] [${requestId}] Deleting file from R2:`, {
      uploadId,
      filename: upload.filename,
      fileUrl: upload.fileUrl,
      bucket: process.env.R2_BUCKET_NAME
    });

    // Delete the object from R2 storage only
    try {
      await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: upload.fileUrl,
      }));
      Logger.info(`[Analyze API] [${requestId}] Successfully deleted file from R2:`, upload.fileUrl);
    } catch (r2Error) {
      Logger.error(`[Analyze API] [${requestId}] Error deleting file from R2:`, r2Error);
    }

    // Keep the upload record in database for analysis history
    // Only mark it as file deleted or update metadata if needed
    Logger.info(`[Analyze API] [${requestId}] Kept upload record for analysis history:`, uploadId);

  } catch (error) {
    Logger.error(`[Analyze API] [${requestId}] Error during file cleanup:`, error);
  }
}