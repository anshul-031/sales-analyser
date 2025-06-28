import fs from 'fs/promises';
import path from 'path';
import { Logger } from './utils';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// Define types for our file-based storage
export interface StoredUpload {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedAt: string;
  userId: string;
}

export interface StoredAnalysis {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  analysisType: 'default' | 'custom' | 'parameters';
  customPrompt?: string;
  customParameters?: any[];
  transcription?: string;
  analysisResult?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  uploadId: string;
  upload: StoredUpload;
}

const DATA_DIR = './data';
const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    Logger.info('[FileStorage] Created data directory:', DATA_DIR);
  }
}

// Read JSON file with fallback to empty array
async function readJsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Write JSON file
async function writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Upload operations
export class FileStorage {
  static async createUpload(upload: Omit<StoredUpload, 'id' | 'uploadedAt'>): Promise<StoredUpload> {
    const uploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
    
    const newUpload: StoredUpload = {
      ...upload,
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date().toISOString(),
    };
    
    uploads.push(newUpload);
    await writeJsonFile(UPLOADS_FILE, uploads);
    
    Logger.info('[FileStorage] Created upload:', newUpload.id);
    return newUpload;
  }

  static async getUploadsByUser(userId: string): Promise<StoredUpload[]> {
    const uploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
    return uploads.filter(upload => upload.userId === userId);
  }

  static async getUploadById(id: string): Promise<StoredUpload | null> {
    const uploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
    return uploads.find(upload => upload.id === id) || null;
  }

  // Analysis operations
  static async createAnalysis(analysis: Omit<StoredAnalysis, 'id' | 'createdAt' | 'updatedAt' | 'upload'>, upload: StoredUpload): Promise<StoredAnalysis> {
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    
    const newAnalysis: StoredAnalysis = {
      ...analysis,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      upload,
    };
    
    analyses.push(newAnalysis);
    await writeJsonFile(ANALYSES_FILE, analyses);
    
    Logger.info('[FileStorage] Created analysis:', newAnalysis.id);
    return newAnalysis;
  }

  static async updateAnalysis(id: string, updates: Partial<StoredAnalysis>): Promise<StoredAnalysis | null> {
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    const index = analyses.findIndex(analysis => analysis.id === id);
    
    if (index === -1) {
      return null;
    }
    
    analyses[index] = {
      ...analyses[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await writeJsonFile(ANALYSES_FILE, analyses);
    
    Logger.info('[FileStorage] Updated analysis:', id);
    return analyses[index];
  }

  static async getAnalysesByUser(userId: string): Promise<StoredAnalysis[]> {
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    return analyses.filter(analysis => analysis.userId === userId);
  }

  static async getAnalysisById(id: string): Promise<StoredAnalysis | null> {
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    return analyses.find(analysis => analysis.id === id) || null;
  }

  static async getAnalysesByUploadId(uploadId: string): Promise<StoredAnalysis[]> {
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    return analyses.filter(analysis => analysis.uploadId === uploadId);
  }

  // Enhanced queries with file relationship
  static async getUploadsWithAnalyses(userId: string): Promise<(StoredUpload & { 
    hasAnalysis: boolean; 
    latestAnalysis: StoredAnalysis | null;
    analyses: StoredAnalysis[];
  })[]> {
    const uploads = await this.getUploadsByUser(userId);
    const allAnalyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    
    return uploads.map(upload => {
      const analyses = allAnalyses.filter(analysis => analysis.uploadId === upload.id);
      const latestAnalysis = analyses.length > 0 
        ? analyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      
      return {
        ...upload,
        hasAnalysis: analyses.length > 0,
        latestAnalysis,
        analyses,
      };
    });
  }

  static async getAnalysesWithUploads(userId: string): Promise<StoredAnalysis[]> {
    const analyses = await this.getAnalysesByUser(userId);
    return analyses.map(analysis => ({
      ...analysis,
      upload: analysis.upload || null,
    }));
  }

  // File cleanup methods
  static async deleteUploadedFile(uploadId: string): Promise<boolean> {
    try {
      const upload = await this.getUploadById(uploadId);
      if (!upload) {
        Logger.warn('[FileStorage] Upload not found for deletion:', uploadId);
        return false;
      }

      // Delete the object from R2
      try {
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: upload.fileUrl, // fileUrl now stores the R2 key
        }));
        Logger.info('[FileStorage] Deleted file from R2:', upload.fileUrl);
      } catch (r2Error) {
        Logger.error('[FileStorage] Error deleting file from R2:', r2Error);
        // We might not want to fail the whole process if R2 deletion fails,
        // but we'll still remove the record.
      }

      // Remove from uploads.json
      const uploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
      const filteredUploads = uploads.filter(u => u.id !== uploadId);
      await writeJsonFile(UPLOADS_FILE, filteredUploads);

      Logger.info('[FileStorage] Removed upload record:', uploadId);
      return true;
    } catch (error) {
      Logger.error('[FileStorage] Error deleting upload:', error);
      return false;
    }
  }

  static async cleanupCompletedAnalysis(analysisId: string): Promise<void> {
    try {
      const analysis = await this.getAnalysisById(analysisId);
      if (!analysis || analysis.status !== 'COMPLETED') {
        return;
      }

      // Delete the uploaded file after successful analysis
      const deleted = await this.deleteUploadedFile(analysis.uploadId);
      if (deleted) {
        Logger.info('[FileStorage] Cleaned up file for completed analysis:', analysisId);
      }
    } catch (error) {
      Logger.error('[FileStorage] Error during cleanup:', error);
    }
  }

  static async cleanupFailedAnalysis(analysisId: string): Promise<void> {
    try {
      const analysis = await this.getAnalysisById(analysisId);
      if (!analysis || analysis.status !== 'FAILED') {
        return;
      }

      // Delete the uploaded file after failed analysis
      const deleted = await this.deleteUploadedFile(analysis.uploadId);
      if (deleted) {
        Logger.info('[FileStorage] Cleaned up file for failed analysis:', analysisId);
      }
    } catch (error) {
      Logger.error('[FileStorage] Error during cleanup for failed analysis:', error);
    }
  }

  // Utility methods
  static async clearUserData(userId: string): Promise<void> {
    // Get user's uploads to delete physical files
    const uploads = await this.getUploadsByUser(userId);
    
    // Delete physical files
    for (const upload of uploads) {
      try {
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: upload.fileUrl,
        }));
        Logger.info('[FileStorage] Deleted file from R2:', upload.fileUrl);
      } catch (error) {
        Logger.warn('[FileStorage] Could not delete file from R2:', upload.fileUrl, error);
      }
    }

    // Remove user's uploads from JSON
    const allUploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
    const filteredUploads = allUploads.filter(upload => upload.userId !== userId);
    await writeJsonFile(UPLOADS_FILE, filteredUploads);

    // Remove user's analyses
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    const filteredAnalyses = analyses.filter(analysis => analysis.userId !== userId);
    await writeJsonFile(ANALYSES_FILE, filteredAnalyses);

    Logger.info('[FileStorage] Cleared data for user:', userId);
  }

  static async getStats(): Promise<{
    totalUploads: number;
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
  }> {
    const uploads = await readJsonFile<StoredUpload>(UPLOADS_FILE);
    const analyses = await readJsonFile<StoredAnalysis>(ANALYSES_FILE);
    
    return {
      totalUploads: uploads.length,
      totalAnalyses: analyses.length,
      completedAnalyses: analyses.filter(a => a.status === 'COMPLETED').length,
      failedAnalyses: analyses.filter(a => a.status === 'FAILED').length,
    };
  }
}