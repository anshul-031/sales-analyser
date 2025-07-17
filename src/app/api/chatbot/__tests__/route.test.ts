/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';

// Mock dependencies using jest.mock with factory functions
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/gemini', () => ({
  geminiService: {
    generateChatbotResponse: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getAnalysisById: jest.fn(),
    getUploadById: jest.fn(),
    getAnalysesByUser: jest.fn(),
    getAllAnalysesByUserId: jest.fn(),
  },
  prisma: {
    analysis: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils');

// Import and get typed references to mocked modules
import { getAuthenticatedUser } from '@/lib/auth';
import { geminiService } from '@/lib/gemini';
import { DatabaseStorage, prisma } from '@/lib/db';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockPrisma = prisma as any;

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

describe('/api/chatbot', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    isEmailVerified: true,
  };

  const mockAnalysis = {
    id: 'analysis-123',
    userId: 'test-user-123',
    uploadId: 'upload-123',
    transcription: 'This is a test transcription of the call',
    analysisType: 'DEFAULT',
    analysisResult: { overallScore: 85 },
    status: 'COMPLETED',
    createdAt: new Date(),
  };

  const mockUpload = {
    id: 'upload-123',
    filename: 'test-call.mp3',
    originalName: 'test-call.mp3',
    fileSize: BigInt(1024),
    mimeType: 'audio/mp3',
    fileUrl: '/uploads/test-call.mp3',
    uploadedAt: new Date(),
    userId: 'test-user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/chatbot', () => {
    it('should require authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should require question parameter', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should handle chatbot query with analysisId', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response here');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.question).toBe('How was the call?');
      expect(data.data.answer).toBe('AI response here');
    });

    it('should return 404 if analysis not found or access denied', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'nonexistent-analysis',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found or access denied');
    });

    it('should return 404 if analysis belongs to different user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue({
        ...mockAnalysis,
        userId: 'different-user-123',
      });

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found or access denied');
    });

    it('should handle chatbot query with uploadId', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockPrisma.analysis.findFirst.mockResolvedValue({
        id: 'analysis-123',
        status: 'COMPLETED',
        createdAt: new Date(),
      });
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response for upload');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What happened in this call?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contextSource).toContain('Upload: test-call.mp3');
    });

    it('should return 404 if upload not found', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getUploadById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What happened in this call?',
          uploadId: 'nonexistent-upload',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload not found or access denied');
    });

    it('should return 404 if no completed analysis found for upload', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockPrisma.analysis.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What happened in this call?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No completed analysis found for this upload');
    });

    it('should handle chatbot query with all user data when no specific ID provided', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: mockUpload,
        } as any,
      ]);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response for all data');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What insights do you have from my calls?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contextSource).toContain('All analyses (1 calls)');
    });

    it('should return 404 if no completed analyses found for user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What insights do you have from my calls?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No completed analyses found');
    });

    it('should filter only completed analyses for all user data', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          status: 'PENDING',
          upload: mockUpload,
        } as any,
        {
          ...mockAnalysis,
          status: 'FAILED',
          upload: mockUpload,
        } as any,
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What insights do you have from my calls?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No completed analyses found');
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('API_KEY_INVALID'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service configuration error');
    });

    it('should handle QUOTA_EXCEEDED error', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('QUOTA_EXCEEDED'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service quota exceeded');
    });

    it('should handle PERMISSION_DENIED error', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('PERMISSION_DENIED'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service permission denied');
    });

    it('should handle generic errors', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('Generic error message'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Generic error message');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockGeminiService.generateChatbotResponse.mockRejectedValue('String error');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process chatbot query');
    });

    it('should handle upload context with analysis loading errors', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
      mockPrisma.analysis.findFirst.mockResolvedValue({
        id: 'analysis-123',
        status: 'COMPLETED',
        createdAt: new Date(),
      });
      // Simulate partial failure in loading analysis details - return null on error
      mockDatabaseStorage.getAnalysisById.mockRejectedValue(new Error('Analysis loading failed'));
      mockGeminiService.generateChatbotResponse.mockResolvedValue('Response despite loading error');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'What happened in this call?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/chatbot', () => {
    it('should require authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return available context for user with completed analyses', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: mockUpload,
        } as any,
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext).toHaveLength(1);
      expect(data.data.totalAnalyses).toBe(1);
    });

    it('should filter out non-completed analyses', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          status: 'PENDING',
          upload: mockUpload,
        } as any,
        {
          ...mockAnalysis,
          status: 'FAILED',
          upload: mockUpload,
        } as any,
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext).toHaveLength(0);
      expect(data.data.totalAnalyses).toBe(0);
    });

    it('should handle missing upload data gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: null as any, // Missing upload data
        } as any,
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext[0].fileName).toBe('Unknown');
    });

    it('should handle missing analysis result gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          analysisResult: null, // Missing analysis result
          upload: mockUpload,
        } as any,
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext[0].overallScore).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser);
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get chatbot context');
    });
  });
});

describe('/api/chatbot', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    isEmailVerified: true,
  } as any;

  const mockAnalysis = {
    id: 'analysis-123',
    userId: 'test-user-123',
    uploadId: 'upload-123',
    transcription: 'This is a test transcription of the call',
    analysisType: 'DEFAULT',
    analysisResult: { overallScore: 85 },
    status: 'COMPLETED',
    createdAt: new Date(),
  } as any;

  const mockUpload = {
    id: 'upload-123',
    filename: 'test-call.mp3',
    originalName: 'test-call.mp3',
    fileSize: BigInt(1024),
    mimeType: 'audio/mp3',
    fileUrl: '/uploads/test-call.mp3',
    uploadedAt: new Date(),
    userId: 'test-user-123',
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/chatbot', () => {
    it('should require authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should require question parameter', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should handle chatbot query with analysisId', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response here');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.question).toBe('How was the call?');
      expect(data.data.answer).toBe('AI response here');
      expect(data.data.contextSource).toContain('Analysis: analysis-123');
    });

    it('should return 404 if analysis not found or access denied', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'nonexistent-analysis',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found or access denied');
    });

    it('should return 404 if analysis belongs to different user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue({
        ...mockAnalysis,
        userId: 'different-user-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found or access denied');
    });

    it('should handle chatbot query with uploadId', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockPrisma.analysis.findFirst.mockResolvedValue({
        id: 'analysis-123',
        status: 'COMPLETED',
        createdAt: new Date(),
      });
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response for upload');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was this upload?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contextSource).toContain('Upload: test-call.mp3');
    });

    it('should return 404 if upload not found', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was this upload?',
          uploadId: 'nonexistent-upload',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Upload not found or access denied');
    });

    it('should return 404 if no completed analysis found for upload', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockPrisma.analysis.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was this upload?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No completed analysis found for this upload');
    });

    it('should handle chatbot query with all user data when no specific ID provided', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: mockUpload as any,
        },
      ]);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response for all data');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How were my calls overall?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contextSource).toContain('All analyses (1 calls)');
    });

    it('should return 404 if no completed analyses found for user', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How were my calls?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No completed analyses found');
    });

    it('should filter only completed analyses for all user data', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          status: 'PENDING',
          upload: mockUpload as any,
        },
        {
          ...mockAnalysis,
          status: 'FAILED',
          upload: mockUpload as any,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How were my calls?',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No completed analyses found');
    });

    it('should handle Gemini API errors gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('API_KEY_INVALID'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service configuration error');
    });

    it('should handle QUOTA_EXCEEDED error', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('QUOTA_EXCEEDED'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service quota exceeded');
    });

    it('should handle PERMISSION_DENIED error', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('PERMISSION_DENIED'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('AI service permission denied');
    });

    it('should handle generic errors', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('Generic error message'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Generic error message');
    });

    it('should handle non-Error exceptions', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysisById.mockResolvedValue(mockAnalysis as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue('String error');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was the call?',
          analysisId: 'analysis-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process chatbot query');
    });

    it('should handle upload context with analysis loading errors', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload as any);
      mockPrisma.analysis.findFirst.mockResolvedValue({
        id: 'analysis-123',
        status: 'COMPLETED',
        createdAt: new Date(),
      });
      // Mock getAnalysisById to reject once for transcription, resolve for analysis result
      mockDatabaseStorage.getAnalysisById
        .mockRejectedValueOnce(new Error('Transcription load error'))
        .mockResolvedValueOnce(mockAnalysis);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('AI response');

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'POST',
        body: JSON.stringify({
          question: 'How was this upload?',
          uploadId: 'upload-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/chatbot', () => {
    it('should require authentication', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should return available context for user with completed analyses', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: mockUpload as any,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext).toHaveLength(1);
      expect(data.data.totalAnalyses).toBe(1);
      expect(data.data.availableContext[0].analysisId).toBe('analysis-123');
      expect(data.data.availableContext[0].fileName).toBe('test-call.mp3');
    });

    it('should filter out non-completed analyses', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          status: 'PENDING',
          upload: mockUpload as any,
        },
        {
          ...mockAnalysis,
          status: 'FAILED',
          upload: mockUpload as any,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext).toHaveLength(0);
      expect(data.data.totalAnalyses).toBe(0);
      expect(data.data.message).toContain('No completed analyses found');
    });

    it('should handle missing upload data gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          upload: null,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext[0].fileName).toBe('Unknown');
    });

    it('should handle missing analysis result gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([
        {
          ...mockAnalysis,
          analysisResult: null,
          upload: mockUpload as any,
        },
      ]);

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableContext[0].overallScore).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockDatabaseStorage.getAnalysesByUser.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/chatbot', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get chatbot context');
    });
  });
});
