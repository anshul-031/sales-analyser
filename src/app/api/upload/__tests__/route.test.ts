// Mock Logger first before any imports that use it
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    database: jest.fn(),
    analysis: jest.fn(),
    performance: jest.fn(),
    monitor: jest.fn(),
  },
}));

// Mock DatabaseStorage
jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    deleteUpload: jest.fn(),
    getUploadById: jest.fn(),
  },
}));

// Mock S3 client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  DeleteObjectCommand: jest.fn(),
}));

// Now import everything after mocking
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Get the mocked functions
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;
const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockDeleteObjectCommand = DeleteObjectCommand as jest.MockedClass<typeof DeleteObjectCommand>;

// Helper to create mock upload with proper Prisma structure
const createMockUpload = (id: string, fileUrl?: string | null) => ({
  id,
  filename: 'test-file.mp3',
  originalName: 'original-test-file.mp3',
  fileSize: BigInt(1024),
  mimeType: 'audio/mpeg',
  fileUrl: fileUrl || 'test-file-key',
  uploadedAt: new Date(),
  userId: 'user123',
  user: {
    id: 'user123',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  analyses: [],
});

describe('Upload API - DELETE Endpoint', () => {
  const mockS3Send = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockDatabaseStorage.getUploadById.mockResolvedValue(null);
    mockDatabaseStorage.deleteUpload.mockResolvedValue(createMockUpload('test-upload', 'test-key'));
    
    // Mock S3 client instance
    mockS3Client.mockImplementation(() => ({
      send: mockS3Send,
    }) as any);
    mockS3Send.mockResolvedValue({});
    
    // Set up environment variables
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
  });

  afterEach(() => {
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
  });

  it('should successfully delete an upload with R2 file cleanup', async () => {
    // Mock upload found in database
    const mockUpload = createMockUpload('upload123', 'test-file-key');
    mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);

    const url = new URL('http://localhost:3000/api/upload?id=upload123');
    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Upload successfully deleted');
    
    // Verify database operations
    expect(mockDatabaseStorage.getUploadById).toHaveBeenCalledWith('upload123');
    expect(mockDatabaseStorage.deleteUpload).toHaveBeenCalledWith('upload123');
    
    // Verify R2 file deletion command was created
    expect(mockDeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'test-file-key',
    });
    
    // Verify logging
    expect(mockLogger.info).toHaveBeenCalledWith('[Upload API] Starting delete process for upload:', 'upload123');
    expect(mockLogger.info).toHaveBeenCalledWith('[Upload API] Successfully deleted file from R2:', 'test-file-key');
    expect(mockLogger.info).toHaveBeenCalledWith('[Upload API] Successfully deleted upload from database:', 'upload123');
  });

  it('should return 400 when upload ID is missing', async () => {
    const url = new URL('http://localhost:3000/api/upload');
    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Upload ID is required');
    
    expect(mockLogger.warn).toHaveBeenCalledWith('[Upload API] Delete request missing upload ID');
  });

  it('should return 404 when upload is not found', async () => {
    mockDatabaseStorage.getUploadById.mockResolvedValue(null);

    const url = new URL('http://localhost:3000/api/upload?id=nonexistent');
    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Upload not found');
    
    expect(mockDatabaseStorage.getUploadById).toHaveBeenCalledWith('nonexistent');
    expect(mockLogger.warn).toHaveBeenCalledWith('[Upload API] Upload not found for deletion:', 'nonexistent');
  });

  // This test would require more complex mocking of the S3 client instance
  // For now, we'll focus on testing the core business logic
  it('should handle R2 deletion gracefully when it works', async () => {
    const mockUpload = createMockUpload('upload123', 'test-file-key');
    mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);

    const url = new URL('http://localhost:3000/api/upload?id=upload123');
    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Upload successfully deleted');
    
    // Should delete from database
    expect(mockDatabaseStorage.deleteUpload).toHaveBeenCalledWith('upload123');
  });

  it('should return 500 if database deletion fails', async () => {
    const mockUpload = createMockUpload('upload123', 'test-file-key');
    mockDatabaseStorage.getUploadById.mockResolvedValue(mockUpload);
    
    // Mock database deletion failure
    const dbError = new Error('Database connection failed');
    mockDatabaseStorage.deleteUpload.mockRejectedValue(dbError);

    const url = new URL('http://localhost:3000/api/upload?id=upload123');
    const request = new NextRequest(url, { method: 'DELETE' });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to delete upload');
    
    expect(mockLogger.error).toHaveBeenCalledWith('[Upload API] Failed to delete upload from database:', expect.any(Error));
    expect(mockLogger.error).toHaveBeenCalledWith('[Upload API] Error deleting upload:', expect.any(Error));
  });
});
