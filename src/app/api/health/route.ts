import { NextRequest, NextResponse } from 'next/server';
import { LoggingConfig } from '@/lib/logging-config';

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Returns system health status and environment information
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: object
 *                 timeouts:
 *                   type: object
 *                   description: Current timeout configuration
 *                 configuration:
 *                   type: object
 *                   description: Current system configuration
 */
export async function GET(request: NextRequest) {
  console.log('[HEALTH] Health check endpoint called');
  
  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      uptime: process.uptime()
    },
    timeouts: {
      transcription: LoggingConfig.timeouts.transcription,
      analysis: LoggingConfig.timeouts.analysis,
      customAnalysis: LoggingConfig.timeouts.customAnalysis,
      geminiApi: LoggingConfig.timeouts.geminiApiTimeout,
      longRunning: LoggingConfig.timeouts.longRunningTimeout,
      backgroundProcessing: LoggingConfig.timeouts.backgroundProcessingTimeout,
      heartbeatInterval: LoggingConfig.timeouts.heartbeatInterval
    },
    configuration: {
      logLevel: LoggingConfig.logLevel,
      enableDatabaseLogs: LoggingConfig.enableDatabaseLogs,
      enableAnalysisDebug: LoggingConfig.enableAnalysisDebug,
      enableProductionLogs: LoggingConfig.enableProductionLogs,
      slowOperationThreshold: LoggingConfig.slowOperationThreshold
    },
    geminiConfiguration: {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17',
      hasApiKeys: !!process.env.GOOGLE_GEMINI_API_KEYS,
      apiKeyCount: process.env.GOOGLE_GEMINI_API_KEYS 
        ? JSON.parse(process.env.GOOGLE_GEMINI_API_KEYS).length 
        : 0
    }
  });
}
