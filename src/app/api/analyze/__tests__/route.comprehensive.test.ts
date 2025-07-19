/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock all external dependencies first
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    createAnalysis: jest.fn(),
    updateAnalysis: jest.fn(),
    getAnalysisById: jest.fn(),
    getUploadById: jest.fn(),
    deleteAnalysis: jest.fn(),
    createUpload: jest.fn(),
    deleteUpload: jest.fn(),
    getAllAnalysesByUserId: jest.fn(),
    getAnalysesByUser: jest.fn(),
  },
}));

jest.mock('@/lib/gemini', () => ({
  geminiService: {
    analyzeWithDefaultParameters: jest.fn(),
    analyzeWithCustomParameters: jest.fn(),
    analyzeWithCustomPrompt: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    analysis: jest.fn(),
    monitor: jest.fn(),
    database: jest.fn(),
    performance: jest.fn(),
  },
  AdaptiveTimeout: {
    execute: jest.fn(),
    createExtendableTimeout: jest.fn(),
  },
}));

jest.mock('@/lib/logging-config', () => ({
  LoggingConfig: {
    timeouts: {
      geminiApiTimeout: 30000,
      longRunningTimeout: 300000,
      backgroundProcessingTimeout: 600000,
      heartbeatInterval: 30000,
    },
    logLevel: 'info',
    enableDatabaseLogs: true,
    enableAnalysisDebug: true,
    slowOperationThreshold: 5000,
  },
  ProductionMonitoring: {},
  ErrorCategories: {},
  ErrorCategory: {},
}));

jest.mock('@/lib/analysis-monitor', () => ({
  analysisMonitor: {
    startAnalysis: jest.fn(),
    updateProgress: jest.fn(),
    completeAnalysis: jest.fn(),
    failAnalysis: jest.fn(),
    getStatus: jest.fn(),
    startMonitoring: jest.fn(),
    registerAnalysis: jest.fn(),
    updateAnalysisStage: jest.fn(),
  },
}));

// Import mocked modules
import { getAuthenticatedUser } from '@/lib/auth';
import { DatabaseStorage } from '@/lib/db';
import { geminiService } from '@/lib/gemini';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Logger, AdaptiveTimeout } from '@/lib/utils';
import { analysisMonitor } from '@/lib/analysis-monitor';

// Type the mocks
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockGetObjectCommand = GetObjectCommand as jest.MockedClass<typeof GetObjectCommand>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockAdaptiveTimeout = AdaptiveTimeout as jest.Mocked<typeof AdaptiveTimeout>;
const mockAnalysisMonitor = analysisMonitor as jest.Mocked<typeof analysisMonitor>;

describe('Analyze API - Comprehensive Coverage', () => {
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    password: 'hashedpassword',
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUpload = {
    id: 'upload123',
    filename: 'test.mp3',
    originalName: 'test.mp3',
    fileSize: BigInt(1024000),
    mimeType: 'audio/mpeg',
    fileUrl: 'test-file-key',
    uploadedAt: new Date(),
    userId: 'user123',
    user: mockUser,
    analyses: [],
  };

  const mockS3Send = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables
    process.env.R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';

    // Default successful auth
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    
    // Default successful upload lookup
    mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);

    // Mock S3 client
    mockS3Client.mockImplementation(() => ({
      send: mockS3Send,
    }) as any);

    // Mock adaptive timeout to just return the promise
    mockAdaptiveTimeout.createExtendableTimeout.mockImplementation((promise) => promise);
  });

  afterEach(() => {
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });

  describe('POST /api/analyze', () => {
    it('should handle missing authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle missing uploadIds', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload IDs are required');
    });

    it('should handle empty uploadIds array', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: [],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload IDs are required');
    });

    it('should handle missing analysisType', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis type must be "default", "custom", or "parameters"');
    });

    it('should handle invalid analysisType', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'invalid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis type must be "default", "custom", or "parameters"');
    });

    it('should handle custom analysis without customPrompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'custom',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
            expect(data.error).toBe('Custom prompt is required for custom analysis');
    });

    it('should accept whitespace-only custom prompt (no validation)', async () => {
      const mockUpload = {
        id: 'upload123',
        userId: 'user123',
        filename: 'test.mp3',
        fileUrl: 'test-key',
        fileSize: BigInt(1024),
        mimeType: 'audio/mpeg',
        uploadedAt: new Date(),
        user: { id: 'user123', email: 'test@example.com' },
        analyses: []
      };

      const mockCreatedAnalysis = {
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'CUSTOM',
        userId: 'user123',
        uploadId: 'upload123',
        customPrompt: '   ',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockDatabaseStorage.createAnalysis.mockResolvedValue(mockCreatedAnalysis as any);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'custom',
          customPrompt: '   ',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should filter out invalid upload IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['', null, undefined, 'valid-id'],
          analysisType: 'default',
        }),
      });

    // Mock only the valid upload
    mockDatabaseStorage.getUploadById.mockImplementation((id: string) => {
      if (id === 'valid-id') {
        return Promise.resolve({ ...mockUpload, id: 'valid-id' } as any);
      }
      return Promise.resolve(null);
    });      // Mock analysis creation
      mockDatabaseStorage.createAnalysis.mockResolvedValue({
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'DEFAULT',
        userId: 'user123',
        uploadId: 'valid-id',
        customPrompt: null,
        customParameters: null,
      } as any);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Filtered out invalid upload IDs'),
        3,
        'invalid IDs'
      );
    });

    it('should handle upload not found', async () => {
      mockDatabaseStorage.getUploadById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['nonexistent'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
      expect(data.summary.failed).toBe(1);
    });

    it('should handle upload belonging to different user', async () => {
      mockDatabaseStorage.getUploadById.mockResolvedValue({
        ...mockUpload,
        userId: 'different-user',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
      expect(data.summary.failed).toBe(1);
    });

    it('should successfully create analysis', async () => {
      mockDatabaseStorage.createAnalysis.mockResolvedValue({
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'DEFAULT',
        userId: 'user123',
        uploadId: 'upload123',
        customPrompt: null,
        customParameters: null,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
      expect(data.analyses[0]).toEqual({
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'DEFAULT',
        userId: 'user123',
        uploadId: 'upload123',
        customPrompt: null,
        customParameters: null,
      });
      expect(mockAnalysisMonitor.registerAnalysis).toHaveBeenCalled();
    });

    it('should handle database error during analysis creation', async () => {
      mockDatabaseStorage.createAnalysis.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(0);
      expect(data.summary.failed).toBe(1);
    });

    it('should handle parameters analysis type', async () => {
      mockDatabaseStorage.createAnalysis.mockResolvedValue({
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'PARAMETERS',
        userId: 'user123',
        uploadId: 'upload123',
        customPrompt: null,
        customParameters: [{ id: '1', name: 'Test', enabled: true }],
      } as any);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'parameters',
          customParameters: [{ id: '1', name: 'Test', enabled: true }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses[0].analysisType).toBe('PARAMETERS');
    });

    it('should handle custom analysis type', async () => {
      mockDatabaseStorage.createAnalysis.mockResolvedValue({
        id: 'analysis123',
        status: 'PENDING',
        analysisType: 'CUSTOM',
        userId: 'user123',
        uploadId: 'upload123',
        customPrompt: 'Analyze this call',
        customParameters: null,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'custom',
          customPrompt: 'Analyze this call',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses[0].analysisType).toBe('CUSTOM');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetAuthenticatedUser.mockRejectedValue('String error');

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis request failed');
    });
  });

  describe('GET /api/analyze', () => {
    const mockAnalysis = {
      id: 'analysis123',
      status: 'COMPLETED',
      analysisType: 'DEFAULT',
      userId: 'user123',
      uploadId: 'upload123',
      analysisResult: { score: 85 },
      transcription: 'Test transcription',
    };

    it('should handle missing authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle unauthenticated request', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should get analysis by analysisId', async () => {
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123&analysisId=analysis123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
      expect(data.analyses[0]).toEqual(mockAnalysis);
    });

    it('should handle analysis not found by ID', async () => {
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123&analysisId=nonexistent');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found');
    });

    it('should get analyses by uploadId', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([mockAnalysis] as any);

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123&uploadId=upload123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toEqual([mockAnalysis]);
    });

    it('should get all analyses for user', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([mockAnalysis] as any);

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toEqual([mockAnalysis]);
    });

    it('should handle database error in GET', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch analyses');
    });

    it('should handle non-Error exceptions in GET', async () => {
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue('String error');

      const request = new NextRequest('http://localhost:3000/api/analyze?userId=user123');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch analyses');
    });
  });
});
