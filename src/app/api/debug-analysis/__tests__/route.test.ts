import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../route';

// Mock the dependencies
jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getAnalysisById: jest.fn(),
    getUploadById: jest.fn(),
    getUploadsByUser: jest.fn(),
  },
}));

jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

describe('/api/debug-analysis API Route', () => {
  const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
  const mockLogger = Logger as jest.Mocked<typeof Logger>;
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/debug-analysis', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return specific analysis when analysisId is provided', async () => {
      const mockUser = { id: 'user123' };
      const mockAnalysis = {
        id: 'analysis123',
        status: 'completed',
        analysisResult: { summary: 'Test summary', insights: ['insight1'] },
        transcription: 'Test transcription',
      };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis?analysisId=analysis123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('analysis');
      expect(data.data).toEqual(mockAnalysis);
      expect(data.debug).toEqual({
        hasAnalysisResult: true,
        hasTranscription: true,
        analysisStatus: 'completed',
        analysisResultType: 'object',
        analysisResultKeys: ['summary', 'insights'],
        rawAnalysisResult: mockAnalysis.analysisResult,
      });
      expect(mockDatabaseStorage.getAnalysisById).toHaveBeenCalledWith('analysis123');
    });

    it('should return analysis debug info with no result', async () => {
      const mockUser = { id: 'user123' };
      const mockAnalysis = {
        id: 'analysis123',
        status: 'processing',
        analysisResult: null,
        transcription: null,
      };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis?analysisId=analysis123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.debug).toEqual({
        hasAnalysisResult: false,
        hasTranscription: false,
        analysisStatus: 'processing',
        analysisResultType: 'object',
        analysisResultKeys: [],
        rawAnalysisResult: null,
      });
    });

    it('should return upload data when uploadId is provided', async () => {
      const mockUser = { id: 'user123' };
      const mockUpload = {
        id: 'upload123',
        originalName: 'test.mp3',
        analyses: [
          {
            id: 'analysis1',
            status: 'completed',
            analysisResult: { summary: 'Test' },
            transcription: 'Test transcription',
          },
          {
            id: 'analysis2',
            status: 'processing',
            analysisResult: null,
            transcription: null,
          },
        ],
      };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis?uploadId=upload123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('upload');
      expect(data.data).toEqual(mockUpload);
      expect(data.debug).toEqual({
        hasAnalyses: true,
        analysesCount: 2,
        analysesData: [
          {
            id: 'analysis1',
            status: 'completed',
            hasResult: true,
            hasTranscription: true,
            resultType: 'object',
            resultKeys: ['summary'],
          },
          {
            id: 'analysis2',
            status: 'processing',
            hasResult: false,
            hasTranscription: false,
            resultType: 'object',
            resultKeys: [],
          },
        ],
      });
    });

    it('should return upload data with no analyses', async () => {
      const mockUser = { id: 'user123' };
      const mockUpload = {
        id: 'upload123',
        originalName: 'test.mp3',
        analyses: [],
      };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis?uploadId=upload123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.debug).toEqual({
        hasAnalyses: false,
        analysesCount: 0,
        analysesData: [],
      });
    });

    it('should return all uploads for user when no specific ID is provided', async () => {
      const mockUser = { id: 'user123' };
      const mockUploads = [
        {
          id: 'upload1',
          originalName: 'test1.mp3',
          analyses: [
            {
              id: 'analysis1',
              status: 'completed',
              analysisResult: 'String result',
              transcription: 'Test transcription',
            },
          ],
        },
        {
          id: 'upload2',
          originalName: 'test2.mp3',
          analyses: [
            {
              id: 'analysis2',
              status: 'completed',
              analysisResult: { summary: 'Object result' },
              transcription: null,
            },
          ],
        },
      ];
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: mockUploads } as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.type).toBe('all_uploads');
      expect(data.count).toBe(2);
      expect(data.uploads).toEqual([
        {
          id: 'upload1',
          originalName: 'test1.mp3',
          analysesCount: 1,
          analyses: [
            {
              id: 'analysis1',
              status: 'completed',
              hasResult: true,
              hasTranscription: true,
              resultType: 'string',
              resultPreview: 'String result...',
            },
          ],
        },
        {
          id: 'upload2',
          originalName: 'test2.mp3',
          analysesCount: 1,
          analyses: [
            {
              id: 'analysis2',
              status: 'completed',
              hasResult: true,
              hasTranscription: false,
              resultType: 'object',
              resultPreview: 'Object with keys: summary',
            },
          ],
        },
      ]);
      expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', { includeAnalyses: true });
    });

    it('should handle long string results with preview truncation', async () => {
      const mockUser = { id: 'user123' };
      const longResult = 'x'.repeat(200); // 200 characters
      const mockUploads = [
        {
          id: 'upload1',
          originalName: 'test.mp3',
          analyses: [
            {
              id: 'analysis1',
              status: 'completed',
              analysisResult: longResult,
              transcription: 'Test',
            },
          ],
        },
      ];
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: mockUploads } as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.uploads[0].analyses[0].resultPreview).toBe(longResult.substring(0, 100) + '...');
    });

    it('should handle no analysis result', async () => {
      const mockUser = { id: 'user123' };
      const mockUploads = [
        {
          id: 'upload1',
          originalName: 'test.mp3',
          analyses: [
            {
              id: 'analysis1',
              status: 'processing',
              analysisResult: null,
              transcription: null,
            },
          ],
        },
      ];
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: mockUploads } as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data.uploads[0].analyses[0].resultPreview).toBe('No result');
    });

    it('should handle errors gracefully', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(new Error('Authentication failed'));
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Debug request failed');
      expect(data.details).toBe('Authentication failed');
      expect(mockLogger.error).toHaveBeenCalledWith('[Debug API] Request failed:', expect.any(Error));
    });

    it('should log request parameters', async () => {
      const mockUser = { id: 'user123' };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: [] } as any);
      
      const request = new NextRequest('http://localhost:3000/api/debug-analysis?analysisId=test&uploadId=test2');
      
      await GET(request);

      expect(mockLogger.info).toHaveBeenCalledWith('[Debug API] Request - analysisId: test, uploadId: test2');
    });
  });
});
