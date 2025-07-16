import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

// Mock all dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/auth');
jest.mock('@/lib/gemini');
jest.mock('@aws-sdk/client-s3');
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  AdaptiveTimeout: {
    createAdaptiveTimeout: jest.fn((promise) => promise),
  },
  GeminiCircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue('mocked result'),
    getStats: jest.fn().mockReturnValue({ failures: 0, successes: 0 }),
  })),
}));
jest.mock('@/lib/logging-config');
jest.mock('@/lib/analysis-monitor', () => ({
  analysisMonitor: {
    startMonitoring: jest.fn(),
  },
}));

const mockDatabaseStorage = {
  getUploadById: jest.fn(),
  createAnalysis: jest.fn(),
  getAnalysesByUser: jest.fn(),
} as any;

// Mock DatabaseStorage static methods
Object.assign(DatabaseStorage, mockDatabaseStorage);

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

describe('/api/analyze', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockUpload = {
    id: 'upload-123',
    userId: 'user-123',
    filename: 'test.mp3',
    originalName: 'test.mp3',
    fileSize: BigInt(1024),
    mimeType: 'audio/mpeg',
    fileUrl: 'https://example.com/test.mp3',
    uploadedAt: new Date(),
    user: mockUser,
    analyses: [],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ uploadIds: ['upload-123'] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 400 if uploadIds is missing', async () => {
      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload IDs are required');
    });

    it('should return 400 if uploadIds is empty', async () => {
      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ uploadIds: [] }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload IDs are required');
    });

    it('should handle upload not found', async () => {
      mockDatabaseStorage.getUploadById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'default'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
    });

    it('should handle upload belonging to different user', async () => {
      const otherUserUpload = { ...mockUpload, userId: 'other-user' };
      mockDatabaseStorage.getUploadById.mockResolvedValue(otherUserUpload);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'default'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
    });

    it('should successfully create analysis with default parameters', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        uploadId: 'upload-123',
        userId: 'user-123',
        status: 'PENDING',
        analysisType: 'DEFAULT',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        upload: mockUpload,
        callMetrics: null,
        insights: [],
      } as any;

      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockDatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'default'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
      expect(data.analyses[0].id).toBe('analysis-123');
    });

    it('should successfully create analysis with custom prompt', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        uploadId: 'upload-123',
        userId: 'user-123',
        status: 'PENDING',
        analysisType: 'CUSTOM',
        customPrompt: 'Analyze for sales effectiveness',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        upload: mockUpload,
        callMetrics: null,
        insights: [],
      } as any;

      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockDatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'custom',
          customPrompt: 'Analyze for sales effectiveness'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses[0].customPrompt).toBe('Analyze for sales effectiveness');
    });

    it('should successfully create analysis with custom parameters', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        uploadId: 'upload-123',
        userId: 'user-123',
        status: 'PENDING',
        analysisType: 'PARAMETERS',
        customParameters: [{ name: 'test', description: 'test param' }],
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        upload: mockUpload,
        callMetrics: null,
        insights: [],
      } as any;

      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockDatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'parameters',
          customParameters: [{ name: 'test', description: 'test param' }]
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses[0].customParameters).toEqual([{ name: 'test', description: 'test param' }]);
    });

    it('should handle selected action item types', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        uploadId: 'upload-123',
        userId: 'user-123',
        status: 'PENDING',
        analysisType: 'DEFAULT',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockUser,
        upload: mockUpload,
        callMetrics: null,
        insights: [],
      } as any;

      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockDatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'default',
          selectedActionItemTypes: ['follow-up', 'meeting']
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Analysis request failed');
    });

    it('should handle database errors during analysis creation', async () => {
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockDatabaseStorage.createAnalysis.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ 
          uploadIds: ['upload-123'],
          analysisType: 'default'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
    });
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/analyze');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return user analyses successfully', async () => {
      const mockAnalyses = [
        {
          id: 'analysis-1',
          userId: 'user-123',
          status: 'COMPLETED',
          analysisType: 'DEFAULT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'analysis-2',
          userId: 'user-123',
          status: 'PENDING',
          analysisType: 'CUSTOM',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue(mockAnalyses);

      const request = new NextRequest('http://localhost/api/analyze');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(2);
      expect(data.analyses[0].id).toBe('analysis-1');
    });

    it('should handle database errors during analysis retrieval', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/analyze');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch analyses');
    });

    it('should return empty array when no analyses found', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/analyze');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
    });
  });
});
