import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { getAuthenticatedUser } from '@/lib/auth';
import { DatabaseStorage } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getUploadsByUser: jest.fn(),
    deleteAllUploadsForUser: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  const mockS3Client = jest.fn().mockImplementation(() => ({
    send: mockSend,
  }));
  return {
    S3Client: mockS3Client,
    DeleteObjectCommand: jest.fn(),
    __mockSend: mockSend, // Export for access in tests
  };
});

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;

// Get the mock S3 send function
const mockS3Send = jest.requireMock('@aws-sdk/client-s3').__mockSend;

describe('/api/upload/all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete all uploads for authenticated user', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploads = [
      {
        id: 'upload1',
        filename: 'call1.mp3',
        originalName: 'Sales Call 1.mp3',
        fileSize: BigInt(1024000),
        mimeType: 'audio/mpeg',
        fileUrl: 'uploads/call1.mp3',
        userId: 'user123',
        uploadedAt: new Date('2023-01-01T00:00:00.000Z'),
      },
      {
        id: 'upload2',
        filename: 'call2.mp3',
        originalName: 'Sales Call 2.mp3',
        fileSize: BigInt(2048000),
        mimeType: 'audio/mpeg',
        fileUrl: 'uploads/call2.mp3',
        userId: 'user123',
        uploadedAt: new Date('2023-01-02T00:00:00.000Z'),
      },
    ];

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploads,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    mockDatabaseStorage.deleteAllUploadsForUser.mockResolvedValue(2);
    mockS3Send.mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      message: 'All uploads deleted successfully',
      deletedCount: 2,
    });

    expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123');
    expect(mockDatabaseStorage.deleteAllUploadsForUser).toHaveBeenCalledWith('user123');
    expect(mockS3Send).toHaveBeenCalledTimes(2);
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
    });

    const response = await DELETE(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Authentication required',
    });

    expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mockDatabaseStorage.getUploadsByUser).not.toHaveBeenCalled();
  });

  it('should handle case when no uploads exist', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      message: 'No uploads to delete',
      deletedCount: 0,
    });

    expect(mockDatabaseStorage.deleteAllUploadsForUser).not.toHaveBeenCalled();
    expect(mockS3Send).not.toHaveBeenCalled();
  });

  it('should handle S3 deletion errors gracefully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploads = [
      {
        id: 'upload1',
        filename: 'call1.mp3',
        originalName: 'Sales Call 1.mp3',
        fileSize: BigInt(1024000),
        mimeType: 'audio/mpeg',
        fileUrl: 'uploads/call1.mp3',
        userId: 'user123',
        uploadedAt: new Date('2023-01-01T00:00:00.000Z'),
      },
    ];

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploads,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    mockDatabaseStorage.deleteAllUploadsForUser.mockResolvedValue(1);
    mockS3Send.mockRejectedValue(new Error('S3 error'));

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedCount).toBe(1);
  });

  it('should handle database errors', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Failed to delete all uploads',
      details: 'Database error',
    });
  });

  it('should handle uploads without fileUrl', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploads = [
      {
        id: 'upload1',
        filename: 'call1.mp3',
        originalName: 'Sales Call 1.mp3',
        fileSize: BigInt(1024000),
        mimeType: 'audio/mpeg',
        fileUrl: null as any,
        userId: 'user123',
        uploadedAt: new Date('2023-01-01T00:00:00.000Z'),
      },
    ];

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploads,
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    mockDatabaseStorage.deleteAllUploadsForUser.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/upload/all', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(mockS3Send).not.toHaveBeenCalled();
  });
});
