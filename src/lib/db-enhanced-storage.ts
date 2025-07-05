/**
 * Enhanced Database Storage with Timeout and Retry Handling
 * This class provides robust database operations with automatic retry logic
 */

import { prisma, withRetry, safeDbOperation } from './db-enhanced';
import { Logger } from './utils';

export class EnhancedDatabaseStorage {
  /**
   * Enhanced updateAnalysis with timeout and retry handling
   */
  static async updateAnalysis(id: string, updates: {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    transcription?: string;
    analysisResult?: any;
    errorMessage?: string;
    analysisDuration?: number;
  }) {
    return safeDbOperation(async () => {
      const updatedAnalysis = await prisma.analysis.update({
        where: { id },
        data: updates,
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });

      Logger.info('[EnhancedDB] Updated analysis:', id);
      return updatedAnalysis;
    }, `updateAnalysis(${id})`);
  }

  /**
   * Enhanced createAnalysis with timeout and retry handling
   */
  static async createAnalysis(analysis: {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    analysisType: 'DEFAULT' | 'CUSTOM' | 'PARAMETERS';
    customPrompt?: string;
    customParameters?: any;
    userId: string;
    uploadId: string;
  }) {
    return safeDbOperation(async () => {
      const newAnalysis = await prisma.analysis.create({
        data: {
          status: analysis.status || 'PENDING',
          analysisType: analysis.analysisType,
          customPrompt: analysis.customPrompt,
          customParameters: analysis.customParameters,
          userId: analysis.userId,
          uploadId: analysis.uploadId,
        },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });

      Logger.info('[EnhancedDB] Created analysis:', newAnalysis.id);
      return newAnalysis;
    }, 'createAnalysis');
  }

  /**
   * Enhanced getAnalysisById with timeout and retry handling
   */
  static async getAnalysisById(id: string) {
    return safeDbOperation(async () => {
      const analysis = await prisma.analysis.findUnique({
        where: { id },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });
      return analysis;
    }, `getAnalysisById(${id})`);
  }

  /**
   * Enhanced getAnalysisByUploadId with timeout and retry handling
   */
  static async getAnalysisByUploadId(uploadId: string) {
    return safeDbOperation(async () => {
      const analysis = await prisma.analysis.findFirst({
        where: { uploadId },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return analysis;
    }, `getAnalysisByUploadId(${uploadId})`);
  }

  /**
   * Enhanced getAnalysesByUser with timeout and retry handling
   */
  static async getAnalysesByUser(userId: string) {
    return safeDbOperation(async () => {
      const analyses = await prisma.analysis.findMany({
        where: { userId },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return analyses;
    }, `getAnalysesByUser(${userId})`);
  }

  /**
   * Enhanced createUpload with timeout and retry handling
   */
  static async createUpload(upload: {
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    userId: string;
  }) {
    return safeDbOperation(async () => {
      const newUpload = await prisma.upload.create({
        data: {
          filename: upload.filename,
          originalName: upload.originalName,
          fileSize: BigInt(upload.fileSize),
          mimeType: upload.mimeType,
          fileUrl: upload.fileUrl,
          userId: upload.userId,
        },
        include: {
          user: true,
          analyses: {
            orderBy: { createdAt: 'desc' },
            include: {
              insights: true,
              callMetrics: true,
            },
          },
        },
      });

      Logger.info('[EnhancedDB] Created upload:', newUpload.id);
      return newUpload;
    }, 'createUpload');
  }

  /**
   * Enhanced getUploadById with timeout and retry handling
   */
  static async getUploadById(id: string) {
    // Validate the ID parameter
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error(`Invalid upload ID: ${id}. ID must be a non-empty string.`);
    }

    return safeDbOperation(async () => {
      const upload = await prisma.upload.findUnique({
        where: { id },
        include: {
          user: true,
          analyses: {
            orderBy: { createdAt: 'desc' },
            include: {
              insights: true,
              callMetrics: true,
            },
          },
        },
      });
      return upload;
    }, `getUploadById(${id})`);
  }

  /**
   * Enhanced createAnalysisInsight with timeout and retry handling
   */
  static async createAnalysisInsight(insight: {
    analysisId: string;
    category: string;
    key: string;
    value: any;
    confidence?: number;
  }) {
    return safeDbOperation(async () => {
      const newInsight = await prisma.analysisInsight.create({
        data: insight,
      });

      Logger.info('[EnhancedDB] Created analysis insight:', newInsight.id);
      return newInsight;
    }, 'createAnalysisInsight');
  }

  /**
   * Enhanced createCallMetrics with timeout and retry handling
   */
  static async createCallMetrics(metrics: {
    analysisId: string;
    duration?: number;
    participantCount?: number;
    wordCount?: number;
    sentimentScore?: number;
    energyLevel?: number;
    talkRatio?: any;
    interruptionCount?: number;
    pauseCount?: number;
    speakingPace?: number;
  }) {
    return safeDbOperation(async () => {
      const newMetrics = await prisma.callMetrics.create({
        data: metrics,
      });

      Logger.info('[EnhancedDB] Created call metrics:', newMetrics.id);
      return newMetrics;
    }, 'createCallMetrics');
  }

  /**
   * Enhanced updateCallMetrics with timeout and retry handling
   */
  static async updateCallMetrics(analysisId: string, updates: {
    duration?: number;
    participantCount?: number;
    wordCount?: number;
    sentimentScore?: number;
    energyLevel?: number;
    talkRatio?: any;
    interruptionCount?: number;
    pauseCount?: number;
    speakingPace?: number;
  }) {
    return safeDbOperation(async () => {
      const updatedMetrics = await prisma.callMetrics.upsert({
        where: { analysisId },
        update: updates,
        create: {
          analysisId,
          ...updates,
        },
      });

      Logger.info('[EnhancedDB] Updated call metrics for analysis:', analysisId);
      return updatedMetrics;
    }, `updateCallMetrics(${analysisId})`);
  }

  /**
   * Enhanced deleteUpload with timeout and retry handling
   */
  static async deleteUpload(id: string) {
    return safeDbOperation(async () => {
      const deleted = await prisma.upload.delete({
        where: { id },
      });
      Logger.info('[EnhancedDB] Deleted upload:', id);
      return deleted;
    }, `deleteUpload(${id})`);
  }

  /**
   * Batch operation with timeout and retry handling
   */
  static async batchUpdateAnalyses(updates: Array<{
    id: string;
    data: {
      status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
      transcription?: string;
      analysisResult?: any;
      errorMessage?: string;
      analysisDuration?: number;
    };
  }>) {
    return safeDbOperation(async () => {
      const results = await Promise.all(
        updates.map(({ id, data }) =>
          prisma.analysis.update({
            where: { id },
            data,
            select: {
              id: true,
              status: true,
              updatedAt: true,
            },
          })
        )
      );

      Logger.info(`[EnhancedDB] Batch updated ${results.length} analyses`);
      return results;
    }, `batchUpdateAnalyses(${updates.length} items)`);
  }

  /**
   * Health check operation
   */
  static async healthCheck() {
    return safeDbOperation(async () => {
      const result = await prisma.$queryRaw`SELECT 1 as health`;
      Logger.info('[EnhancedDB] Health check successful');
      return result;
    }, 'healthCheck');
  }
}

export default EnhancedDatabaseStorage;
