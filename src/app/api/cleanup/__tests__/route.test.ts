import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET } from '../route';

// Mock the dependencies
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getUploadById: jest.fn(),
    getAnalysesByUser: jest.fn(),
    getUploadsByUser: jest.fn(),
  },
}));

jest.mock('@/types/enums', () => ({
  isAnalysisCompleted: jest.fn(),
}));

import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { isAnalysisCompleted } from '@/types/enums';

describe('/api/cleanup API Route', () => {
  const mockLogger = Logger as jest.Mocked<typeof Logger>;
  const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
  const mockIsAnalysisCompleted = isAnalysisCompleted as jest.MockedFunction<typeof isAnalysisCompleted>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /api/cleanup', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/cleanup');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID is required');
    });

    it('should return 404 if specific upload is not found', async () => {
      mockDatabaseStorage.getUploadById.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123&uploadId=upload123');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload not found');
      expect(mockDatabaseStorage.getUploadById).toHaveBeenCalledWith('upload123');
    });

    it('should return 403 if user is not authorized for upload', async () => {
      const mockUpload = {
        id: 'upload123',
        userId: 'differentUser',
        filename: 'test.mp3',
        user: { id: 'differentUser' },
        analyses: []
      } as any;
      
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123&uploadId=upload123');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should preserve upload records for specific upload', async () => {
      const mockUpload = {
        id: 'upload123',
        userId: 'user123',
        filename: 'test.mp3',
        user: { id: 'user123' },
        analyses: []
      } as any;
      
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123&uploadId=upload123');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(false);
      expect(data.message).toContain('Upload records are preserved for analysis history');
    });

    it('should handle bulk cleanup for all user analyses', async () => {
      const mockAnalyses = [
        { id: '1', status: 'completed', uploadId: 'upload1' },
        { id: '2', status: 'processing', uploadId: 'upload2' },
        { id: '3', status: 'completed', uploadId: 'upload3' },
      ] as any[];
      
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue(mockAnalyses);
      mockIsAnalysisCompleted
        .mockReturnValueOnce(true)  // first analysis
        .mockReturnValueOnce(false) // second analysis
        .mockReturnValueOnce(true); // third analysis
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(0);
      expect(data.totalCompleted).toBe(2);
      expect(data.message).toContain('2 completed analyses');
    });

    it('should handle errors gracefully', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue(new Error('Database error'));
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123');
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Cleanup failed');
      expect(data.details).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('[Cleanup API] Cleanup request failed:', expect.any(Error));
    });
  });

  describe('GET /api/cleanup', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/cleanup');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID is required');
    });

    it('should return cleanup status successfully', async () => {
      const mockUploads = [
        { id: 'upload1', userId: 'user123', filename: 'test1.mp3', originalName: 'test1.mp3', fileSize: BigInt(1000), mimeType: 'audio/mp3', fileUrl: 'url1', uploadedAt: new Date() },
        { id: 'upload2', userId: 'user123', filename: 'test2.mp3', originalName: 'test2.mp3', fileSize: BigInt(2000), mimeType: 'audio/mp3', fileUrl: 'url2', uploadedAt: new Date() },
      ] as any[];
      
      const mockAnalyses = [
        { id: '1', status: 'completed', uploadId: 'upload1', user: {}, upload: {}, callMetrics: {}, insights: {} },
        { id: '2', status: 'processing', uploadId: 'upload2', user: {}, upload: {}, callMetrics: {}, insights: {} },
        { id: '3', status: 'completed', uploadId: 'upload1', user: {}, upload: {}, callMetrics: {}, insights: {} },
      ] as any[];
      
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: mockUploads } as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue(mockAnalyses);
      mockIsAnalysisCompleted
        .mockReturnValueOnce(true)  // first analysis
        .mockReturnValueOnce(false) // second analysis  
        .mockReturnValueOnce(true)  // third analysis
        .mockReturnValueOnce(true)  // for filtering uploads
        .mockReturnValueOnce(false) // for filtering uploads
        .mockReturnValueOnce(true); // for filtering uploads
      
      // Mock environment variable
      const originalEnv = process.env.AUTO_DELETE_FILES;
      process.env.AUTO_DELETE_FILES = 'true';
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toEqual({
        totalUploads: 2,
        totalAnalyses: 3,
        completedAnalyses: 2,
        filesEligibleForCleanup: 1,
        autoDeleteEnabled: true
      });
      
      // Restore environment variable
      process.env.AUTO_DELETE_FILES = originalEnv;
    });

    it('should handle errors in GET request', async () => {
      mockDatabaseStorage.getUploadsByUser.mockRejectedValue(new Error('Database connection failed'));
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get cleanup status');
      expect(data.details).toBe('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('[Cleanup API] Status request failed:', expect.any(Error));
    });

    it('should handle auto delete disabled', async () => {
      const mockUploads = [{ 
        id: 'upload1', 
        userId: 'user123', 
        filename: 'test.mp3', 
        originalName: 'test.mp3', 
        fileSize: BigInt(1000), 
        mimeType: 'audio/mp3', 
        fileUrl: 'url', 
        uploadedAt: new Date() 
      }] as any[];
      const mockAnalyses = [{ 
        id: '1', 
        status: 'completed', 
        uploadId: 'upload1',
        user: {}, 
        upload: {}, 
        callMetrics: {}, 
        insights: {} 
      }] as any[];
      
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: mockUploads } as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue(mockAnalyses);
      mockIsAnalysisCompleted.mockReturnValue(true);
      
      // Mock environment variable as disabled
      const originalEnv = process.env.AUTO_DELETE_FILES;
      process.env.AUTO_DELETE_FILES = 'false';
      
      const request = new NextRequest('http://localhost:3000/api/cleanup?userId=user123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status.autoDeleteEnabled).toBe(false);
      
      // Restore environment variable
      process.env.AUTO_DELETE_FILES = originalEnv;
    });
  });
});
