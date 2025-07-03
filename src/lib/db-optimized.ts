/**
 * Database Operations Optimized for Bandwidth Reduction
 * This file contains optimized database operations to reduce PostgreSQL egress fees
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from './utils';

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with optimized configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export class OptimizedDatabaseStorage {
  // Lightweight upload operations - only essential fields
  static async getUploadsListByUser(userId: string, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const [uploads, totalCount] = await Promise.all([
        prisma.upload.findMany({
          where: { userId },
          select: {
            id: true,
            filename: true,
            originalName: true,
            fileSize: true,
            mimeType: true,
            uploadedAt: true,
            // Only get essential analysis metadata
            analyses: {
              select: {
                id: true,
                status: true,
                analysisType: true,
                createdAt: true,
                // Don't include large fields like transcription or analysisResult
              },
              orderBy: { createdAt: 'desc' },
              take: 1, // Only get the latest analysis
            },
          },
          orderBy: { uploadedAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.upload.count({
          where: { userId },
        }),
      ]);

      Logger.info(`[OptimizedDB] Retrieved ${uploads.length} uploads (page ${page}/${Math.ceil(totalCount / limit)})`);
      
      return {
        uploads,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting uploads list:', error);
      throw error;
    }
  }

  // Get upload details only when needed
  static async getUploadDetails(uploadId: string, userId: string) {
    try {
      const upload = await prisma.upload.findFirst({
        where: { 
          id: uploadId,
          userId, // Ensure user ownership
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          fileUrl: true,
          uploadedAt: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (!upload) {
        throw new Error('Upload not found or access denied');
      }

      Logger.info('[OptimizedDB] Retrieved upload details:', uploadId);
      return upload;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting upload details:', error);
      throw error;
    }
  }

  // Get analysis summary without large fields
  static async getAnalysisSummary(analysisId: string, userId: string) {
    try {
      const analysis = await prisma.analysis.findFirst({
        where: { 
          id: analysisId,
          userId, // Ensure user ownership
        },
        select: {
          id: true,
          status: true,
          analysisType: true,
          customPrompt: true,
          errorMessage: true,
          analysisDuration: true,
          createdAt: true,
          updatedAt: true,
          uploadId: true,
          // Don't include transcription or analysisResult here
          upload: {
            select: {
              id: true,
              originalName: true,
              fileSize: true,
            },
          },
          callMetrics: {
            select: {
              duration: true,
              participantCount: true,
              wordCount: true,
              sentimentScore: true,
              energyLevel: true,
              speakingPace: true,
            },
          },
        },
      });

      if (!analysis) {
        throw new Error('Analysis not found or access denied');
      }

      Logger.info('[OptimizedDB] Retrieved analysis summary:', analysisId);
      return analysis;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting analysis summary:', error);
      throw error;
    }
  }

  // Get analysis result only when specifically requested
  static async getAnalysisResult(analysisId: string, userId: string) {
    try {
      const analysis = await prisma.analysis.findFirst({
        where: { 
          id: analysisId,
          userId,
          status: 'COMPLETED', // Only return if completed
        },
        select: {
          id: true,
          analysisResult: true,
          // Only return the result data
        },
      });

      if (!analysis) {
        throw new Error('Analysis result not found or not ready');
      }

      Logger.info('[OptimizedDB] Retrieved analysis result:', analysisId);
      return analysis.analysisResult;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting analysis result:', error);
      throw error;
    }
  }

  // Get transcription only when specifically requested
  static async getTranscription(analysisId: string, userId: string) {
    try {
      const analysis = await prisma.analysis.findFirst({
        where: { 
          id: analysisId,
          userId,
        },
        select: {
          id: true,
          transcription: true,
        },
      });

      if (!analysis) {
        throw new Error('Transcription not found or access denied');
      }

      Logger.info('[OptimizedDB] Retrieved transcription:', analysisId);
      return analysis.transcription;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting transcription:', error);
      throw error;
    }
  }

  // Lightweight analytics with aggregated data only
  static async getUserAnalyticsOptimized(userId: string) {
    try {
      const [
        totalUploads,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        recentAnalysesCount,
        avgAnalysisDuration,
      ] = await Promise.all([
        prisma.upload.count({
          where: { userId },
        }),
        prisma.analysis.count({
          where: { userId },
        }),
        prisma.analysis.count({
          where: { userId, status: 'COMPLETED' },
        }),
        prisma.analysis.count({
          where: { userId, status: 'FAILED' },
        }),
        prisma.analysis.count({
          where: { 
            userId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        }),
        prisma.analysis.aggregate({
          where: { 
            userId,
            status: 'COMPLETED',
            analysisDuration: { not: null },
          },
          _avg: {
            analysisDuration: true,
          },
        }),
      ]);

      const analytics = {
        totalUploads,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        pendingAnalyses: totalAnalyses - completedAnalyses - failedAnalyses,
        successRate: totalAnalyses > 0 ? Math.round((completedAnalyses / totalAnalyses) * 100) : 0,
        recentAnalysesCount,
        avgAnalysisDuration: avgAnalysisDuration._avg.analysisDuration || 0,
      };

      Logger.info('[OptimizedDB] Retrieved optimized user analytics');
      return analytics;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting user analytics:', error);
      throw error;
    }
  }

  // Get recent activity without large fields
  static async getRecentActivity(userId: string, limit = 10) {
    try {
      const recentAnalyses = await prisma.analysis.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          analysisType: true,
          createdAt: true,
          analysisDuration: true,
          upload: {
            select: {
              id: true,
              originalName: true,
              fileSize: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      Logger.info(`[OptimizedDB] Retrieved ${recentAnalyses.length} recent activities`);
      return recentAnalyses;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting recent activity:', error);
      throw error;
    }
  }

  // Batch operations for efficiency
  static async getMultipleAnalysesSummary(analysisIds: string[], userId: string) {
    try {
      const analyses = await prisma.analysis.findMany({
        where: { 
          id: { in: analysisIds },
          userId,
        },
        select: {
          id: true,
          status: true,
          analysisType: true,
          createdAt: true,
          errorMessage: true,
          upload: {
            select: {
              id: true,
              originalName: true,
            },
          },
        },
      });

      Logger.info(`[OptimizedDB] Retrieved ${analyses.length} analysis summaries in batch`);
      return analyses;
    } catch (error) {
      Logger.error('[OptimizedDB] Error getting multiple analyses summary:', error);
      throw error;
    }
  }

  // Search uploads with minimal data
  static async searchUploads(userId: string, query: string, limit = 10) {
    try {
      const uploads = await prisma.upload.findMany({
        where: {
          userId,
          OR: [
            { originalName: { contains: query, mode: 'insensitive' } },
            { filename: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
          analyses: {
            select: {
              id: true,
              status: true,
              analysisType: true,
              createdAt: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        take: limit,
        orderBy: { uploadedAt: 'desc' },
      });

      Logger.info(`[OptimizedDB] Found ${uploads.length} uploads matching query`);
      return uploads;
    } catch (error) {
      Logger.error('[OptimizedDB] Error searching uploads:', error);
      throw error;
    }
  }

  // Update operations - keep existing functionality
  static async createUpload(upload: {
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    userId: string;
  }) {
    try {
      const newUpload = await prisma.upload.create({
        data: {
          filename: upload.filename,
          originalName: upload.originalName,
          fileSize: BigInt(upload.fileSize),
          mimeType: upload.mimeType,
          fileUrl: upload.fileUrl,
          userId: upload.userId,
        },
        select: {
          id: true,
          filename: true,
          originalName: true,
          uploadedAt: true,
        },
      });

      Logger.info('[OptimizedDB] Created upload:', newUpload.id);
      return newUpload;
    } catch (error) {
      Logger.error('[OptimizedDB] Error creating upload:', error);
      throw error;
    }
  }

  static async createAnalysis(analysis: {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    analysisType: 'DEFAULT' | 'CUSTOM' | 'PARAMETERS';
    customPrompt?: string;
    customParameters?: any;
    userId: string;
    uploadId: string;
  }) {
    try {
      const newAnalysis = await prisma.analysis.create({
        data: {
          status: analysis.status || 'PENDING',
          analysisType: analysis.analysisType,
          customPrompt: analysis.customPrompt,
          customParameters: analysis.customParameters,
          userId: analysis.userId,
          uploadId: analysis.uploadId,
        },
        select: {
          id: true,
          status: true,
          analysisType: true,
          createdAt: true,
        },
      });

      Logger.info('[OptimizedDB] Created analysis:', newAnalysis.id);
      return newAnalysis;
    } catch (error) {
      Logger.error('[OptimizedDB] Error creating analysis:', error);
      throw error;
    }
  }

  static async updateAnalysis(id: string, updates: {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    transcription?: string;
    analysisResult?: any;
    errorMessage?: string;
    analysisDuration?: number;
  }) {
    try {
      const updatedAnalysis = await prisma.analysis.update({
        where: { id },
        data: updates,
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      Logger.info('[OptimizedDB] Updated analysis:', id);
      return updatedAnalysis;
    } catch (error) {
      Logger.error('[OptimizedDB] Error updating analysis:', error);
      throw error;
    }
  }

  static async deleteUpload(id: string, userId: string) {
    try {
      // Verify ownership before deletion
      const upload = await prisma.upload.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!upload) {
        throw new Error('Upload not found or access denied');
      }

      const deleted = await prisma.upload.delete({
        where: { id },
        select: { id: true },
      });

      Logger.info('[OptimizedDB] Deleted upload:', id);
      return deleted;
    } catch (error) {
      Logger.error('[OptimizedDB] Error deleting upload:', error);
      throw error;
    }
  }
}

export default prisma;
