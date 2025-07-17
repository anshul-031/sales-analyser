import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getAuthenticatedUser } from '@/lib/auth';
import { DatabaseStorage } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getUploadsByUser: jest.fn(),
  },
}));

jest.mock('@/lib/serialization', () => ({
  serializeBigInt: jest.fn((data) => {
    // Properly handle BigInt serialization for testing
    return JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }),
}));

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockDatabaseStorage = DatabaseStorage as jest.Mocked<typeof DatabaseStorage>;

describe('/api/uploads-optimized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return uploads for authenticated user with default parameters', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [
        {
          id: 'upload1',
          filename: 'call1.mp3',
          originalName: 'Sales Call 1.mp3',
          fileSize: BigInt(1024000),
          mimeType: 'audio/mpeg',
          fileUrl: 'uploads/call1.mp3',
          userId: 'user123',
          uploadedAt: new Date('2023-01-01T00:00:00.000Z'),
          analyses: [
            {
              id: 'analysis1',
              status: 'COMPLETED',
              analysisResult: { summary: 'Test summary' },
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      uploads: [
        {
          id: 'upload1',
          filename: 'call1.mp3',
          originalName: 'Sales Call 1.mp3',
          fileSize: '1024000', // Serialized as string
          mimeType: 'audio/mpeg',
          fileUrl: 'uploads/call1.mp3',
          userId: 'user123',
          uploadedAt: '2023-01-01T00:00:00.000Z', // Serialized as string
          analyses: [
            {
              id: 'analysis1',
              status: 'COMPLETED',
              analysisResult: { summary: 'Test summary' },
            },
          ],
        },
      ],
      pagination: mockUploadsResult.pagination,
    });

    expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', {
      includeAnalyses: true,
      page: 1,
      limit: 20,
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Authentication required',
    });

    expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mockDatabaseStorage.getUploadsByUser).not.toHaveBeenCalled();
  });

  it('should handle custom pagination parameters', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [],
      pagination: {
        page: 2,
        limit: 10,
        total: 15,
        totalPages: 2,
        hasNext: false,
        hasPrev: true,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized?page=2&limit=10', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);

    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', {
      includeAnalyses: true,
      page: 2,
      limit: 10,
    });
  });

  it('should handle includeAnalyses parameter set to false', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [
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
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized?includeAnalyses=false', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', {
      includeAnalyses: false,
      page: 1,
      limit: 20,
    });
  });

  it('should handle invalid pagination parameters gracefully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized?page=invalid&limit=abc', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Should default to NaN for invalid input (parseInt behavior)
    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', {
      includeAnalyses: true,
      page: NaN,
      limit: NaN,
    });
  });

  it('should handle database errors', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch uploads',
      details: 'Database connection failed',
    });
  });

  it('should handle authentication service errors', async () => {
    mockGetAuthenticatedUser.mockRejectedValue(new Error('Auth service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch uploads',
      details: 'Auth service unavailable',
    });
  });

  it('should return empty uploads array when no uploads exist', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      uploads: [],
      pagination: mockUploadsResult.pagination,
    });
  });

  it('should handle edge case pagination values', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockUploadsResult = {
      uploads: [],
      pagination: {
        page: 0,
        limit: 0,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockDatabaseStorage.getUploadsByUser.mockResolvedValue(mockUploadsResult);

    const request = new NextRequest('http://localhost:3000/api/uploads-optimized?page=0&limit=0', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // parseInt('0') returns 0, which should be passed through
    expect(mockDatabaseStorage.getUploadsByUser).toHaveBeenCalledWith('user123', {
      includeAnalyses: true,
      page: 0,
      limit: 0,
    });
  });
});
