/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock dependencies using jest.mock with factory functions
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
  prisma: {
    analysis: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    upload: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
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
  },
  AdaptiveTimeout: {
    execute: jest.fn(),
    createExtendableTimeout: jest.fn(),
  },
}));

jest.mock('@/lib/logging-config');

jest.mock('@/lib/analysis-monitor', () => ({
  analysisMonitor: {
    startAnalysis: jest.fn(),
    updateProgress: jest.fn(),
    completeAnalysis: jest.fn(),
    failAnalysis: jest.fn(),
    getStatus: jest.fn(),
    startMonitoring: jest.fn(),
  },
}));

// Import and get typed references to mocked modules
import { getAuthenticatedUser } from '@/lib/auth';
import { DatabaseStorage, prisma } from '@/lib/db';
import { geminiService } from '@/lib/gemini';
import { Logger, AdaptiveTimeout } from '@/lib/utils';
import { analysisMonitor } from '@/lib/analysis-monitor';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockPrisma = prisma as any;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockAdaptiveTimeout = AdaptiveTimeout as jest.Mocked<typeof AdaptiveTimeout>;
const mockAnalysisMonitor = analysisMonitor as jest.Mocked<typeof analysisMonitor>;

const mockS3Client = {
  send: jest.fn(),
} as any;

// Mock console methods to suppress logs in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('/api/analyze - Extended Coverage Tests', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: undefined,
    lastName: undefined,
    isEmailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationExpires: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUpload = {
    id: 'upload-123',
    userId: 'test-user-123',
    filename: 'test-audio.mp3',
    originalName: 'test-audio.mp3',
    fileSize: BigInt(1024000),
    mimeType: 'audio/mpeg',
    fileUrl: 'https://example.com/test-audio.mp3',
    uploadedAt: new Date(),
    user: mockUser,
    analyses: [],
  } as any;

  const mockAnalysis = {
    id: 'analysis-123',
    uploadId: 'upload-123',
    userId: 'test-user-123',
    status: 'PENDING',
    analysisType: 'DEFAULT',
    transcription: null,
    analysisResult: null,
    analysisDuration: null,
    customPrompt: null,
    customParameters: null,
    selectedActionItemTypes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    upload: mockUpload,
    callMetrics: null,
    insights: [],
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
    mockDatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([mockAnalysis]);
    mockAdaptiveTimeout.createExtendableTimeout.mockImplementation((promise) => promise);
    mockAnalysisMonitor.startMonitoring.mockReturnValue(undefined);
    
    // Mock Logger methods
    mockLogger.info.mockReturnValue(undefined);
    mockLogger.error.mockReturnValue(undefined);
    mockLogger.warn.mockReturnValue(undefined);
    mockLogger.debug.mockReturnValue(undefined);
    mockLogger.analysis.mockReturnValue(undefined);
    mockLogger.monitor.mockReturnValue(undefined);
  });

  describe('POST /api/analyze - Input Validation', () => {
    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      // API returns 500 for JSON parsing errors on missing body
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle unexpected analysisType values', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload-123'],
          analysisType: 'invalid-type',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Analysis type must be');
    });

    it('should handle empty custom parameters array', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload-123'],
          analysisType: 'parameters',
          customParameters: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Custom parameters are required');
    });

    it('should handle empty custom prompt', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload-123'],
          analysisType: 'custom',
          customPrompt: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Custom prompt is required');
    });

    it('should handle successful default analysis', async () => {
      mockGeminiService.analyzeWithDefaultParameters.mockResolvedValue({
        overallScore: 85,
        parameters: [{ name: 'Test', score: 85, feedback: 'Good' }]
      });

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          uploadIds: ['upload-123'],
          analysisType: 'default',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
    });
  });

  describe('GET /api/analyze - Basic Coverage', () => {
    it('should require authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return user analyses successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analyses).toHaveLength(1);
    });
  });
});
