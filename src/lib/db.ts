import { PrismaClient } from '@prisma/client';
import { Logger } from './utils';

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with proper configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
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

  static async getUploadsByUser(userId: string) {
    try {
      const uploads = await prisma.upload.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
        include: {
          analyses: {
            orderBy: { createdAt: 'desc' },
            include: {
              insights: true,
              callMetrics: true,
            },
          },
        },
      });
      return uploads;
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

  static async getAnalysisById(id: string) {
    try {
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

  // Advanced query operations
  static async getAnalysisWithInsights(analysisId: string) {
    try {
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        include: {
          user: true,
          upload: true,
          insights: {
            orderBy: { createdAt: 'desc' },
          },
          callMetrics: true,
        },
      });
      return analysis;
    } catch (error) {
      Logger.error('[Database] Error getting analysis with insights:', error);
      throw error;
    }
  }

  static async getUserAnalyticsData(userId: string) {
    try {
      const totalUploads = await prisma.upload.count({
        where: { userId },
      });

      const totalAnalyses = await prisma.analysis.count({
        where: { userId },
      });

      const completedAnalyses = await prisma.analysis.count({
        where: { userId, status: 'COMPLETED' },
      });

      const failedAnalyses = await prisma.analysis.count({
        where: { userId, status: 'FAILED' },
      });

      const recentAnalyses = await prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          upload: true,
          insights: true,
          callMetrics: true,
        },
      });

      return {
        totalUploads,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        successRate: totalAnalyses > 0 ? (completedAnalyses / totalAnalyses) * 100 : 0,
        recentAnalyses,
      };
    } catch (error) {
      Logger.error('[Database] Error getting user analytics data:', error);
      throw error;
    }
  }

  // Cleanup operations
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
}

export default prisma;
