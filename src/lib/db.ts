import { PrismaClient, AnalysisStatus as PrismaAnalysisStatus } from '@prisma/client';
import { Logger } from './utils';

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with proper configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Enhanced logging middleware for database operations
prisma.$use(async (params, next) => {
  const start = Date.now();
  const modelName = params.model || 'Unknown';
  const action = params.action;
  
  Logger.debug(`[Database] Starting ${action} operation on ${modelName}`);
  
  try {
    const result = await next(params);
    const duration = Date.now() - start;
    
    Logger.info(`[Database] Completed ${action} on ${modelName} in ${duration}ms`);
    
    // Log specific operations
    if (action === 'create') {
      Logger.info(`[Database] Created ${modelName}:`, result?.id || 'N/A');
    } else if (action === 'update') {
      Logger.info(`[Database] Updated ${modelName}:`, result?.id || 'N/A');
    } else if (action === 'delete') {
      Logger.info(`[Database] Deleted ${modelName}:`, result?.id || 'N/A');
    } else if (action === 'findMany') {
      Logger.info(`[Database] Found ${Array.isArray(result) ? result.length : 'unknown'} ${modelName} records`);
    } else if (action === 'findUnique' || action === 'findFirst') {
      Logger.info(`[Database] Found ${modelName}:`, result?.id || (result ? 'record found' : 'not found'));
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    Logger.error(`[Database] Error in ${action} on ${modelName} after ${duration}ms:`, error);
    throw error;
  }
});

// In development, save the Prisma client to the global object
// to prevent creating multiple instances during hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to handle database connection
export async function connectToDatabase() {
  try {
    await prisma.$connect();
    Logger.info('[Database] Connected to PostgreSQL database');
    return true;
  } catch (error) {
    Logger.error('[Database] Failed to connect to PostgreSQL:', error);
    return false;
  }
}

// Helper function to disconnect from database
export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    Logger.info('[Database] Disconnected from PostgreSQL database');
  } catch (error) {
    Logger.error('[Database] Error disconnecting from database:', error);
  }
}

// Database utility functions
export class DatabaseStorage {
  // User operations
  // This method is deprecated - use authentication system instead
  static async createUser(userId: string) {
    try {
      // For backward compatibility, we'll find the user by ID
      // In the new auth system, users are created through registration
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new Error('User not found. Please register first.');
      }
      
      Logger.info('[Database] Found user:', userId);
      return user;
    } catch (error) {
      Logger.error('[Database] Error finding user:', error);
      throw error;
    }
  }

  // Upload operations
  static async createUpload(upload: {
    filename: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    userId: string;
  }) {
    try {
      // Ensure user exists
      await this.createUser(upload.userId);

      const newUpload = await prisma.upload.create({
        data: {
          filename: upload.filename,
          originalName: upload.originalName,
          fileSize: BigInt(upload.fileSize),
          mimeType: upload.mimeType,
          fileUrl: upload.fileUrl,
          userId: upload.userId,
        },
      });

      Logger.info('[Database] Created upload:', newUpload.id);
      return newUpload;
    } catch (error) {
      Logger.error('[Database] Error creating upload:', error);
      throw error;
    }
  }

  static async getUploadById(id: string) {
    try {
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
    } catch (error) {
      Logger.error('[Database] Error getting upload by ID:', error);
      throw error;
    }
  }

  static async getUploadsByUser(
    userId: string,
    options: {
      includeAnalyses?: boolean;
      page?: number;
      limit?: number;
    } = { includeAnalyses: true, page: 1, limit: 20 }
  ) {
    try {
      const { includeAnalyses, page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // Get total count
      const totalCount = await prisma.upload.count({
        where: { userId },
      });

      const uploads = await prisma.upload.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit,
      });

      if (includeAnalyses) {
        const uploadIds = uploads.map((u: { id: string }) => u.id);
        const analyses = await prisma.analysis.findMany({
          where: {
            uploadId: {
              in: uploadIds,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            uploadId: true,
            createdAt: true,
          },
        });

        const analysesByUploadId = analyses.reduce((acc: Record<string, (typeof analyses)[0]>, analysis: (typeof analyses)[0]) => {
          if (!acc[analysis.uploadId] || acc[analysis.uploadId].createdAt < analysis.createdAt) {
            acc[analysis.uploadId] = analysis;
          }
          return acc;
        }, {} as Record<string, (typeof analyses)[0]>);

        uploads.forEach((upload: { id: string }) => {
          const analysis = analysesByUploadId[upload.id];
          if (analysis) {
            (upload as any).analyses = [analysis];
          }
        });
      }
      
      return {
        uploads,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      Logger.error('[Database] Error getting uploads by user:', error);
      throw error;
    }
  }

  static async deleteUpload(id: string) {
    try {
      const deleted = await prisma.upload.delete({
        where: { id },
      });
      Logger.info('[Database] Deleted upload:', id);
      return deleted;
    } catch (error) {
      Logger.error('[Database] Error deleting upload:', error);
      throw error;
    }
  }

  // Analysis operations
  static async createAnalysis(analysis: {
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    analysisType: 'DEFAULT' | 'CUSTOM' | 'PARAMETERS';
    customPrompt?: string;
    customParameters?: any;
    userId: string;
    uploadId: string;
  }) {
    try {
      // Ensure user exists
      await this.createUser(analysis.userId);

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

      Logger.info('[Database] Created analysis:', newAnalysis.id);
      return newAnalysis;
    } catch (error) {
      Logger.error('[Database] Error creating analysis:', error);
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
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });

      Logger.info('[Database] Updated analysis:', id);
      return updatedAnalysis;
    } catch (error) {
      Logger.error('[Database] Error updating analysis:', error);
      throw error;
    }
  }

  static async getAnalysisById(
    id: string,
    options: {
      includeUser?: boolean;
      includeUpload?: boolean;
      includeInsights?: boolean;
      includeCallMetrics?: boolean;
    } = { includeUser: true, includeUpload: true, includeInsights: true, includeCallMetrics: true }
  ) {
    try {
      const { includeUser, includeUpload, includeInsights, includeCallMetrics } = options;

      const include: any = {};
      if (includeUser) include.user = true;
      if (includeUpload) include.upload = true;
      if (includeInsights) include.insights = true;
      if (includeCallMetrics) include.callMetrics = true;

      const analysis = await prisma.analysis.findUnique({
        where: { id },
        include,
      });
      return analysis;
    } catch (error) {
      Logger.error('[Database] Error getting analysis by ID:', error);
      throw error;
    }
  }

  static async getAnalysesByUser(userId: string) {
    try {
      const analyses = await prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });
      return analyses;
    } catch (error) {
      Logger.error('[Database] Error getting analyses by user:', error);
      throw error;
    }
  }

  static async getAnalysesByUploadId(uploadId: string) {
    try {
      const analyses = await prisma.analysis.findMany({
        where: { uploadId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });
      return analyses;
    } catch (error) {
      Logger.error('[Database] Error getting analyses by upload ID:', error);
      throw error;
    }
  }

  static async getAnalysesByStatus(status: PrismaAnalysisStatus) {
    try {
      const analyses = await prisma.analysis.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });
      return analyses;
    } catch (error) {
      Logger.error('[Database] Error getting analyses by status:', error);
      throw error;
    }
  }

  static async getAnalysisWithInsights(id: string) {
    try {
      const analysis = await prisma.analysis.findUnique({
        where: { id },
        include: {
          insights: true,
          callMetrics: true,
          user: true,
          upload: true,
        },
      });
      return analysis;
    } catch (error) {
      Logger.error('[Database] Error getting analysis with insights:', error);
      throw error;
    }
  }

  // Insight operations
  static async createInsight(insight: {
    analysisId: string;
    category: string;
    key: string;
    value: any;
    confidence?: number;
  }) {
    try {
      const newInsight = await prisma.analysisInsight.create({
        data: insight,
      });

      Logger.info('[Database] Created insight:', newInsight.id);
      return newInsight;
    } catch (error) {
      Logger.error('[Database] Error creating insight:', error);
      throw error;
    }
  }

  static async createMultipleInsights(insights: Array<{
    analysisId: string;
    category: string;
    key: string;
    value: any;
    confidence?: number;
  }>) {
    try {
      const newInsights = await prisma.analysisInsight.createMany({
        data: insights,
      });

      Logger.info('[Database] Created multiple insights:', newInsights.count);
      return newInsights;
    } catch (error) {
      Logger.error('[Database] Error creating multiple insights:', error);
      throw error;
    }
  }

  // Call metrics operations
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
    try {
      const newMetrics = await prisma.callMetrics.create({
        data: metrics,
      });

      Logger.info('[Database] Created call metrics:', newMetrics.id);
      return newMetrics;
    } catch (error) {
      Logger.error('[Database] Error creating call metrics:', error);
      throw error;
    }
  }

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
    try {
      const updatedMetrics = await prisma.callMetrics.upsert({
        where: { analysisId },
        update: updates,
        create: {
          analysisId,
          ...updates,
        },
      });

      Logger.info('[Database] Updated call metrics for analysis:', analysisId);
      return updatedMetrics;
    } catch (error) {
      Logger.error('[Database] Error updating call metrics:', error);
      throw error;
    }
  }

  // Action Items operations
  static async createActionItem(actionItem: {
    analysisId: string;
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    deadline?: Date;
    comments?: string;
  }) {
    try {
      const newActionItem = await prisma.actionItem.create({
        data: {
          ...actionItem,
          deadline: actionItem.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
        },
      });

      Logger.info('[Database] Created action item:', newActionItem.id);
      return newActionItem;
    } catch (error) {
      Logger.error('[Database] Error creating action item:', error);
      throw error;
    }
  }

  static async createMultipleActionItems(actionItems: Array<{
    analysisId: string;
    title: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    deadline?: Date;
    comments?: string;
  }>) {
    try {
      const actionItemsWithDefaults = actionItems.map(item => ({
        ...item,
        deadline: item.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
      }));

      const newActionItems = await prisma.actionItem.createMany({
        data: actionItemsWithDefaults,
      });

      Logger.info('[Database] Created multiple action items:', newActionItems.count);
      return newActionItems;
    } catch (error) {
      Logger.error('[Database] Error creating multiple action items:', error);
      throw error;
    }
  }

  static async getActionItemsByAnalysisId(analysisId: string) {
    try {
      const actionItems = await prisma.actionItem.findMany({
        where: { analysisId },
        orderBy: [
          { priority: 'desc' }, // HIGH first
          { createdAt: 'asc' }
        ],
      });
      return actionItems;
    } catch (error) {
      Logger.error('[Database] Error getting action items by analysis ID:', error);
      throw error;
    }
  }

  static async updateActionItem(id: string, updates: {
    title?: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    deadline?: Date;
    comments?: string;
  }) {
    try {
      const updatedActionItem = await prisma.actionItem.update({
        where: { id },
        data: updates,
      });

      Logger.info('[Database] Updated action item:', id);
      return updatedActionItem;
    } catch (error) {
      Logger.error('[Database] Error updating action item:', error);
      throw error;
    }
  }

  static async deleteActionItem(id: string) {
    try {
      const deletedActionItem = await prisma.actionItem.delete({
        where: { id },
      });
      Logger.info('[Database] Deleted action item:', id);
      return deletedActionItem;
    } catch (error) {
      Logger.error('[Database] Error deleting action item:', error);
      throw error;
    }
  }

  static async getActionItemsByUserId(userId: string, filters?: {
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    timeframe?: '24h' | '7d' | '30d' | 'all';
  }) {
    try {
      const whereClause: any = {
        analysis: { userId }
      };

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.priority) {
        whereClause.priority = filters.priority;
      }

      if (filters?.timeframe && filters.timeframe !== 'all') {
        let timeAgo: Date;
        switch (filters.timeframe) {
          case '24h':
            timeAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            timeAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            timeAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        whereClause.createdAt = { gte: timeAgo };
      }

      const actionItems = await prisma.actionItem.findMany({
        where: whereClause,
        include: {
          analysis: {
            include: {
              upload: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { deadline: 'asc' }
        ],
      });

      return actionItems;
    } catch (error) {
      Logger.error('[Database] Error getting action items by user ID:', error);
      throw error;
    }
  }

  static async getActionItemsAnalytics(userId: string, timeframe: '24h' | '7d' | '30d' = '7d') {
    try {
      let timeAgo: Date;
      switch (timeframe) {
        case '24h':
          timeAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          timeAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          timeAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const [total, completed, inProgress, notStarted, overdue, highPriority] = await Promise.all([
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            createdAt: { gte: timeAgo }
          }
        }),
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            status: 'COMPLETED',
            createdAt: { gte: timeAgo }
          }
        }),
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            status: 'IN_PROGRESS',
            createdAt: { gte: timeAgo }
          }
        }),
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            status: 'NOT_STARTED',
            createdAt: { gte: timeAgo }
          }
        }),
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            deadline: { lt: new Date() },
            status: { not: 'COMPLETED' },
            createdAt: { gte: timeAgo }
          }
        }),
        prisma.actionItem.count({
          where: {
            analysis: { userId },
            priority: 'HIGH',
            createdAt: { gte: timeAgo }
          }
        })
      ]);

      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        completed,
        inProgress,
        notStarted,
        overdue,
        highPriority,
        completionRate: Math.round(completionRate * 100) / 100,
        timeframe
      };
    } catch (error) {
      Logger.error('[Database] Error getting action items analytics:', error);
      throw error;
    }
  }

  // Cleanup operations
  static async deleteAllUploadsForUser(userId: string) {
    try {
      // Delete in proper order due to foreign key constraints
      // First delete analysis insights
      await prisma.analysisInsight.deleteMany({
        where: { analysis: { userId } },
      });

      // Then delete call metrics
      await prisma.callMetrics.deleteMany({
        where: { analysis: { userId } },
      });

      // Then delete analyses
      await prisma.analysis.deleteMany({
        where: { userId },
      });

      // Finally delete uploads and get the count
      const deletedUploads = await prisma.upload.deleteMany({
        where: { userId },
      });

      Logger.info(`[Database] Deleted ${deletedUploads.count} uploads and related data for user:`, userId);
      return deletedUploads.count;
    } catch (error) {
      Logger.error('[Database] Error deleting all uploads for user:', error);
      throw error;
    }
  }

  static async clearUserData(userId: string) {
    try {
      // Delete in proper order due to foreign key constraints
      await prisma.analysisInsight.deleteMany({
        where: { analysis: { userId } },
      });

      await prisma.callMetrics.deleteMany({
        where: { analysis: { userId } },
      });

      await prisma.analysis.deleteMany({
        where: { userId },
      });

      await prisma.upload.deleteMany({
        where: { userId },
      });

      await prisma.user.delete({
        where: { id: userId },
      });

      Logger.info('[Database] Cleared all data for user:', userId);
    } catch (error) {
      Logger.error('[Database] Error clearing user data:', error);
      throw error;
    }
  }

  static async getGlobalStats() {
    try {
      const totalUsers = await prisma.user.count();
      const totalUploads = await prisma.upload.count();
      const totalAnalyses = await prisma.analysis.count();
      const completedAnalyses = await prisma.analysis.count({
        where: { status: 'COMPLETED' },
      });
      const failedAnalyses = await prisma.analysis.count({
        where: { status: 'FAILED' },
      });

      return {
        totalUsers,
        totalUploads,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        successRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses) * 100 : 0,
      };
    } catch (error) {
      Logger.error('[Database] Error getting global stats:', error);
      throw error;
    }
  }

  static async getActionItemById(id: string) {
    try {
      const actionItem = await prisma.actionItem.findUnique({
        where: { id },
        include: {
          analysis: {
            select: {
              id: true,
              userId: true,
            }
          }
        }
      });

      return actionItem;
    } catch (error) {
      Logger.error('[Database] Error getting action item by ID:', error);
      throw error;
    }
  }
}

export default prisma;
