import { Logger } from './utils';

// Define types for our in-memory storage
export interface MemoryUpload {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileBuffer: Buffer;
  uploadedAt: string;
  userId: string;
}

export interface MemoryAnalysis {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  analysisType: 'default' | 'custom' | 'parameters';
  customPrompt?: string;
  customParameters?: Array<{
    id: string;
    name: string;
    description: string;
    prompt: string;
    enabled: boolean;
  }>;
  transcription?: string;
  analysisResult?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  uploadId: string;
}

// In-memory storage (resets on server restart)
const uploads = new Map<string, MemoryUpload>();
const analyses = new Map<string, MemoryAnalysis>();

// Upload operations
export class MemoryStorage {
  static createUpload(upload: Omit<MemoryUpload, 'id' | 'uploadedAt'>): MemoryUpload {
    const newUpload: MemoryUpload = {
      ...upload,
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date().toISOString(),
    };
    
    uploads.set(newUpload.id, newUpload);
    
    Logger.info('[MemoryStorage] Created upload:', newUpload.id);
    return newUpload;
  }

  static getUploadsByUser(userId: string): MemoryUpload[] {
    return Array.from(uploads.values()).filter(upload => upload.userId === userId);
  }

  static getUploadById(id: string): MemoryUpload | null {
    return uploads.get(id) || null;
  }

  static deleteUpload(id: string): boolean {
    const deleted = uploads.delete(id);
    if (deleted) {
      Logger.info('[MemoryStorage] Deleted upload:', id);
    }
    return deleted;
  }

  // Analysis operations
  static createAnalysis(analysis: Omit<MemoryAnalysis, 'id' | 'createdAt' | 'updatedAt'>): MemoryAnalysis {
    const newAnalysis: MemoryAnalysis = {
      ...analysis,
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    analyses.set(newAnalysis.id, newAnalysis);
    
    Logger.info('[MemoryStorage] Created analysis:', newAnalysis.id);
    return newAnalysis;
  }

  static updateAnalysis(id: string, updates: Partial<MemoryAnalysis>): MemoryAnalysis | null {
    const existing = analyses.get(id);
    if (!existing) {
      return null;
    }
    
    const updated: MemoryAnalysis = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    analyses.set(id, updated);
    
    Logger.info('[MemoryStorage] Updated analysis:', id);
    return updated;
  }

  static getAnalysesByUser(userId: string): MemoryAnalysis[] {
    return Array.from(analyses.values()).filter(analysis => analysis.userId === userId);
  }

  static getAnalysisById(id: string): MemoryAnalysis | null {
    return analyses.get(id) || null;
  }

  static getAnalysesByUploadId(uploadId: string): MemoryAnalysis[] {
    return Array.from(analyses.values()).filter(analysis => analysis.uploadId === uploadId);
  }

  // Enhanced queries with file relationship
  static getUploadsWithAnalyses(userId: string): (MemoryUpload & { 
    hasAnalysis: boolean; 
    latestAnalysis: MemoryAnalysis | null;
    analyses: MemoryAnalysis[];
  })[] {
    const userUploads = this.getUploadsByUser(userId);
    const allAnalyses = Array.from(analyses.values());
    
    return userUploads.map(upload => {
      const uploadAnalyses = allAnalyses.filter(analysis => analysis.uploadId === upload.id);
      const latestAnalysis = uploadAnalyses.length > 0 
        ? uploadAnalyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        : null;
      
      return {
        ...upload,
        hasAnalysis: uploadAnalyses.length > 0,
        latestAnalysis,
        analyses: uploadAnalyses,
      };
    });
  }

  static getAnalysesWithUploads(userId: string): (MemoryAnalysis & { upload: MemoryUpload | null })[] {
    const userAnalyses = this.getAnalysesByUser(userId);
    
    return userAnalyses.map(analysis => {
      const upload = uploads.get(analysis.uploadId) || null;
      return {
        ...analysis,
        upload,
      };
    });
  }

  // Session cleanup (automatically clean up after analysis)
  static cleanupCompletedAnalysis(analysisId: string): void {
    const analysis = this.getAnalysisById(analysisId);
    if (analysis && analysis.status === 'COMPLETED') {
      // Delete the upload from memory
      const deleted = this.deleteUpload(analysis.uploadId);
      if (deleted) {
        Logger.info('[MemoryStorage] Cleaned up upload for completed analysis:', analysisId);
      }
    }
  }

  // Utility methods
  static clearUserData(userId: string): void {
    // Remove user's uploads
    for (const [id, upload] of uploads.entries()) {
      if (upload.userId === userId) {
        uploads.delete(id);
      }
    }

    // Remove user's analyses
    for (const [id, analysis] of analyses.entries()) {
      if (analysis.userId === userId) {
        analyses.delete(id);
      }
    }

    Logger.info('[MemoryStorage] Cleared data for user:', userId);
  }

  static clearAllData(): void {
    uploads.clear();
    analyses.clear();
    Logger.info('[MemoryStorage] Cleared all data');
  }

  static getStats(): {
    totalUploads: number;
    totalAnalyses: number;
    completedAnalyses: number;
    failedAnalyses: number;
  } {
    const allAnalyses = Array.from(analyses.values());
    
    return {
      totalUploads: uploads.size,
      totalAnalyses: analyses.size,
      completedAnalyses: allAnalyses.filter(a => a.status === 'COMPLETED').length,
      failedAnalyses: allAnalyses.filter(a => a.status === 'FAILED').length,
    };
  }
}