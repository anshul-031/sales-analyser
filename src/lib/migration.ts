import { DatabaseStorage } from './db';
import { FileStorage } from './file-storage';
import { Logger } from './utils';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export class DataMigration {
  static async migrateFromFileStorage() {
    Logger.info('[Migration] Starting data migration from file storage to PostgreSQL');

    try {
      // Get all existing data from file storage
      const fileStats = await FileStorage.getStats();
      Logger.info('[Migration] Found file storage data:', fileStats);

      // Read all uploads and analyses from file storage
      const allUploads = await this.getAllUploadsFromFileStorage();
      const allAnalyses = await this.getAllAnalysesFromFileStorage();

      Logger.info('[Migration] Migrating', allUploads.length, 'uploads and', allAnalyses.length, 'analyses');

      // Group uploads by user
      const uploadsByUser = new Map<string, any[]>();
      for (const upload of allUploads) {
        if (!uploadsByUser.has(upload.userId)) {
          uploadsByUser.set(upload.userId, []);
        }
        uploadsByUser.get(upload.userId)!.push(upload);
      }

      // Migrate uploads for each user
      const uploadIdMapping = new Map<string, string>(); // old ID -> new ID
      for (const [userId, uploads] of uploadsByUser) {
        Logger.info('[Migration] Migrating uploads for user:', userId);
        
        for (const upload of uploads) {
          try {
            const newUpload = await DatabaseStorage.createUpload({
              filename: upload.filename,
              originalName: upload.originalName,
              fileSize: upload.fileSize,
              mimeType: upload.mimeType,
              fileUrl: upload.fileUrl,
              userId: upload.userId,
            });
            
            uploadIdMapping.set(upload.id, newUpload.id);
            Logger.info('[Migration] Migrated upload:', upload.id, '->', newUpload.id);
          } catch (error) {
            Logger.error('[Migration] Failed to migrate upload:', upload.id, error);
          }
        }
      }

      // Migrate analyses
      for (const analysis of allAnalyses) {
        try {
          const newUploadId = uploadIdMapping.get(analysis.uploadId);
          if (!newUploadId) {
            Logger.warn('[Migration] Skipping analysis - upload not found:', analysis.uploadId);
            continue;
          }

          const newAnalysis = await DatabaseStorage.createAnalysis({
            status: analysis.status,
            analysisType: analysis.analysisType.toUpperCase() as any,
            customPrompt: analysis.customPrompt,
            customParameters: analysis.customParameters,
            userId: analysis.userId,
            uploadId: newUploadId,
          });

          // Update with additional data if available
          if (analysis.transcription || analysis.analysisResult || analysis.errorMessage || analysis.analysisDuration) {
            await DatabaseStorage.updateAnalysis(newAnalysis.id, {
              transcription: analysis.transcription,
              analysisResult: analysis.analysisResult,
              errorMessage: analysis.errorMessage,
              analysisDuration: analysis.analysisDuration,
            });
          }

          // Extract and store insights if available
          if (analysis.analysisResult) {
            await this.extractInsightsFromAnalysisResult(newAnalysis.id, analysis.analysisResult);
          }

          Logger.info('[Migration] Migrated analysis:', analysis.id, '->', newAnalysis.id);
        } catch (error) {
          Logger.error('[Migration] Failed to migrate analysis:', analysis.id, error);
        }
      }

      Logger.info('[Migration] Data migration completed successfully');
      return {
        success: true,
        migratedUploads: uploadIdMapping.size,
        totalAnalyses: allAnalyses.length,
      };

    } catch (error) {
      Logger.error('[Migration] Data migration failed:', error);
      throw error;
    }
  }

  private static async getAllUploadsFromFileStorage() {
    try {
      // This is a simplified version - you might need to adjust based on your file storage implementation
      const uploadsFile = path.join(os.tmpdir(), 'data', 'uploads.json');
      const data = await fs.readFile(uploadsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.warn('[Migration] Could not read uploads file:', error);
      return [];
    }
  }

  private static async getAllAnalysesFromFileStorage() {
    try {
      const analysesFile = path.join(os.tmpdir(), 'data', 'analyses.json');
      const data = await fs.readFile(analysesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      Logger.warn('[Migration] Could not read analyses file:', error);
      return [];
    }
  }

  private static async extractInsightsFromAnalysisResult(analysisId: string, analysisResult: any) {
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

      // Extract call metrics if available
      if (analysisResult.metrics) {
        const metrics = analysisResult.metrics;
        await DatabaseStorage.createCallMetrics({
          analysisId,
          duration: metrics.duration,
          participantCount: metrics.participantCount,
          wordCount: metrics.wordCount,
          sentimentScore: metrics.sentimentScore,
          energyLevel: metrics.energyLevel,
          talkRatio: metrics.talkRatio,
          interruptionCount: metrics.interruptionCount,
          pauseCount: metrics.pauseCount,
          speakingPace: metrics.speakingPace,
        });
      }

      if (insights.length > 0) {
        await DatabaseStorage.createMultipleInsights(insights);
        Logger.info('[Migration] Extracted', insights.length, 'insights for analysis:', analysisId);
      }
    } catch (error) {
      Logger.error('[Migration] Error extracting insights:', error);
    }
  }

  static async validateMigration() {
    Logger.info('[Migration] Validating migration results');

    try {
      const dbStats = await DatabaseStorage.getGlobalStats();
      const fileStats = await FileStorage.getStats();

      Logger.info('[Migration] Database stats:', dbStats);
      Logger.info('[Migration] File storage stats:', fileStats);

      const validation = {
        uploadsMatch: dbStats.totalUploads >= fileStats.totalUploads,
        analysesMatch: dbStats.totalAnalyses >= fileStats.totalAnalyses,
        completedAnalysesMatch: dbStats.completedAnalyses >= fileStats.completedAnalyses,
        failedAnalysesMatch: dbStats.failedAnalyses >= fileStats.failedAnalyses,
      };

      Logger.info('[Migration] Validation results:', validation);
      return validation;
    } catch (error) {
      Logger.error('[Migration] Validation failed:', error);
      throw error;
    }
  }
}

// CLI script for running migration
if (import.meta.url === `file://${process.argv[1]}`) {
  async function runMigration() {
    try {
      console.log('Starting data migration...');
      const result = await DataMigration.migrateFromFileStorage();
      console.log('Migration completed:', result);
      
      console.log('Validating migration...');
      const validation = await DataMigration.validateMigration();
      console.log('Validation completed:', validation);
      
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  }

  runMigration();
}
