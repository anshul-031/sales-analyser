import { getAuthenticatedUser } from '@/lib/auth';
import { Logger } from '@/lib/utils';
import { POST } from '../route';

// Mock external dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/auth');
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    CreateMultipartUploadCommand: jest.fn(),
    UploadPartCommand: jest.fn(),
    CompleteMultipartUploadCommand: jest.fn(),
    AbortMultipartUploadCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com'),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
}));

// Mock NextRequest class
class MockNextRequest {
  private _body: any;
  private _headers: Map<string, string>;

  constructor(body: any, headers: Record<string, string> = {}) {
    this._body = body;
    this._headers = new Map(Object.entries(headers));
  }

  async json() {
    return this._body;
  }

  get headers() {
    return {
      get: (key: string) => this._headers.get(key) || null,
    };
  }
}

describe('/api/upload-large', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock environment variables for production mode
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      configurable: true,
    });
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';

    // Setup default S3 mock responses
    const { S3Client } = require('@aws-sdk/client-s3');
    const mockS3Instance = new S3Client({});
    mockS3Instance.send.mockImplementation((command: any) => {
      // Mock CreateMultipartUploadCommand
      if (command.constructor.name === 'CreateMultipartUploadCommand') {
        return Promise.resolve({
          UploadId: 'mock-upload-id-123',
          Bucket: 'test-bucket',
          Key: command.input.Key,
        });
      }
      
      // Mock CompleteMultipartUploadCommand
      if (command.constructor.name === 'CompleteMultipartUploadCommand') {
        return Promise.resolve({
          Location: 'https://test-bucket.s3.amazonaws.com/' + command.input.Key,
          Bucket: 'test-bucket',
          Key: command.input.Key,
          ETag: '"mock-final-etag"',
        });
      }
      
      // Mock AbortMultipartUploadCommand
      if (command.constructor.name === 'AbortMultipartUploadCommand') {
        return Promise.resolve({});
      }
      
      // Default response
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    // Clean up environment variables
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalNodeEnv,
      configurable: true,
    });
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication required');
    });

    it('should accept requests with valid authentication', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      // This should not throw authentication error
      await POST(request as any);
      expect(getAuthenticatedUser).toHaveBeenCalled();
    });
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true,
      });
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
    });

    it('should work in development mode without R2 configuration', async () => {
      // Force re-import to pick up new env variables
      jest.resetModules();
      const { POST } = require('../route');
      
      // Re-setup auth mock after module reset
      const { getAuthenticatedUser } = require('@/lib/auth');
      getAuthenticatedUser.mockResolvedValue(mockUser);
      
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isDevelopmentMode).toBe(true);
      expect(data.uploadId).toBe('mock-uuid-12345');
      expect(data.key).toMatch(/^local-uploads\/user-123\/mock-uuid-12345\/test\.mp3$/);
    });

    it('should handle get-upload-urls in development mode', async () => {
      // Force re-import to pick up new env variables
      jest.resetModules();
      const { POST } = require('../route');
      
      // Re-setup auth mock after module reset
      const { getAuthenticatedUser } = require('@/lib/auth');
      getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new MockNextRequest({
        action: 'get-upload-urls',
        key: 'local-uploads/user-123/test-id/test.mp3',
        uploadId: 'test-upload-id',
        parts: 2,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isDevelopmentMode).toBe(true);
      expect(data.urls).toHaveLength(2);
      expect(data.urls[0]).toContain('mock-upload?part=1');
      expect(data.urls[1]).toContain('mock-upload?part=2');
    });

    it('should handle complete-upload in development mode', async () => {
      // Force re-import to pick up new env variables
      jest.resetModules();
      
      // Set up analyze module mock BEFORE importing route
      jest.doMock('../../analyze/route', () => ({
        POST: jest.fn().mockResolvedValue({
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            analyses: []
          })
        })
      }));
      
      const { POST } = require('../route');
      
      // Re-setup auth mock after module reset
      const { getAuthenticatedUser } = require('@/lib/auth');
      getAuthenticatedUser.mockResolvedValue(mockUser);

      // Mock database storage
      const { DatabaseStorage } = require('@/lib/db');
      DatabaseStorage.createUpload.mockResolvedValue({
        id: 'upload-123',
        filename: 'test.mp3',
      });

      const request = new MockNextRequest({
        action: 'complete-upload',
        key: 'local-uploads/user-123/test-id/test.mp3',
        uploadId: 'test-upload-id',
        parts: [{ ETag: '"mock-etag-1"', PartNumber: 1 }],
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
        userId: 'user-123',
        customParameters: [],
        selectedActionItemTypes: [],
        originalContentType: 'audio/mpeg',
      }, {
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(DatabaseStorage.createUpload).toHaveBeenCalled();
    });

    it('should handle abort-upload in development mode', async () => {
      // Force re-import to pick up new env variables
      jest.resetModules();
      const { POST } = require('../route');

      // Re-setup auth mock after module reset
      const { getAuthenticatedUser } = require('@/lib/auth');
      getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new MockNextRequest({
        action: 'abort-upload',
        key: 'local-uploads/user-123/test-id/test.mp3',
        uploadId: 'test-upload-id',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isDevelopmentMode).toBe(true);
    });
  });

  describe('start-upload action', () => {
    it('should validate required parameters', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        // Missing required parameters
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should validate file size limit', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'large-file.mp3',
        contentType: 'audio/mpeg',
        fileSize: 250 * 1024 * 1024, // 250MB (exceeds 200MB limit)
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('File size exceeds the 200MB limit');
    });

    it('should validate MIME type', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'document.pdf',
        contentType: 'application/pdf',
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid MIME type');
    });

    it('should accept valid audio file parameters', async () => {
      const validMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg'];

      for (const mimeType of validMimeTypes) {
        jest.clearAllMocks();
        
        const request = new MockNextRequest({
          action: 'start-upload',
          fileName: `test.${mimeType.split('/')[1]}`,
          contentType: mimeType,
          fileSize: 1024 * 1024, // 1MB
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should handle alternative parameter names', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        filename: 'test.mp3', // Alternative to fileName
        mimeType: 'audio/mpeg', // Alternative to contentType
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Invalid actions', () => {
    it('should reject invalid action', async () => {
      const request = new MockNextRequest({
        action: 'invalid-action',
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });

    it('should handle missing action', async () => {
      const request = new MockNextRequest({
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('JSON parsing', () => {
    it('should handle invalid JSON', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON body');
    });
  });

  describe('Environment validation in production', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true,
      });
    });

    it('should reject requests when R2 environment variables are missing in production', async () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;

      // Force re-import to pick up new env variables
      jest.resetModules();
      const { POST } = require('../route');
      
      // Re-setup auth mock after module reset
      const { getAuthenticatedUser } = require('@/lib/auth');
      getAuthenticatedUser.mockResolvedValue(mockUser);

      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required environment variables');
    });
  });

  describe('Logging', () => {
    it('should log start-upload operations', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      await POST(request as any);

      expect(Logger.info).toHaveBeenCalledWith(
        '[Upload API] Starting multipart upload:',
        expect.objectContaining({
          filename: 'test.mp3',
          contentType: 'audio/mpeg',
          fileSize: 1024,
          userId: 'user-123',
        })
      );
    });

    it('should log environment variable issues', async () => {
      // Clear all mocks first
      jest.clearAllMocks();
      
      // Remove environment variable BEFORE module load
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      
      // Reset modules to clear cache
      jest.resetModules();
      
      // Re-setup the Logger mock BEFORE importing the route module
      jest.doMock('@/lib/utils', () => ({
        Logger: {
          error: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        }
      }));
      
      // Re-setup auth mock
      jest.doMock('@/lib/auth', () => ({
        getAuthenticatedUser: jest.fn().mockResolvedValue(mockUser)
      }));
      
      // NOW import the route module - this will trigger environment validation
      const { POST } = require('../route');
      const { Logger } = require('@/lib/utils');

      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 1024,
      });

      await POST(request as any);

      expect(Logger.error).toHaveBeenCalledWith(
        '[Upload API] Missing required environment variables:',
        expect.arrayContaining(['CLOUDFLARE_ACCOUNT_ID'])
      );
    });
  });

  describe('File size edge cases', () => {
    it('should accept file at exact size limit', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'max-size.mp3',
        contentType: 'audio/mpeg',
        fileSize: 200 * 1024 * 1024, // Exactly 200MB
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject file just over size limit', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'over-size.mp3',
        contentType: 'audio/mpeg',
        fileSize: 200 * 1024 * 1024 + 1, // Just over 200MB
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('File size exceeds the 200MB limit');
    });

    it('should handle zero-size files', async () => {
      const request = new MockNextRequest({
        action: 'start-upload',
        fileName: 'empty.mp3',
        contentType: 'audio/mpeg',
        fileSize: 0,
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Zero-size files should be rejected
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });
  });
});
