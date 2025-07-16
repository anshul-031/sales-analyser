import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getUploadsByUser: jest.fn(),
    getAnalysesByUser: jest.fn(),
    getActionItemsAnalytics: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  Logger: {
    error: jest.fn(),
  },
}));

const mockDatabaseStorage = require('@/lib/db').DatabaseStorage;
const mockGetAuthenticatedUser = require('@/lib/auth').getAuthenticatedUser;

describe('Analytics Optimized API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Authentication required');
  });

  it('returns analytics data for authenticated user', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const mockUploads = [
      { id: 'upload1', userId: 'user123', filename: 'test1.mp3' },
      { id: 'upload2', userId: 'user123', filename: 'test2.mp3' },
    ];

    const mockAnalyses = [
      { id: 'analysis1', uploadId: 'upload1', status: 'completed' },
      { id: 'analysis2', uploadId: 'upload2', status: 'processing' },
    ];

    const mockActionItems = {
      total: 10,
      completed: 5,
      pending: 5,
    };

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploads,
      pagination: { total: 2, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue(mockAnalyses);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue(mockActionItems);

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.analytics).toBeDefined();
    expect(data.analytics.uploads).toEqual(mockUploads);
    expect(data.analytics.analyses).toEqual(mockAnalyses);
    expect(data.analytics.actionItems).toEqual(mockActionItems);
  });

  it('handles query parameters correctly', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: [],
      pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/analytics-optimized?timeframe=30d&recentAnalysesLimit=10');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockDatabaseStorage.getActionItemsAnalytics).toHaveBeenCalledWith('user123', '30d');
  });

  it('handles BigInt serialization', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const mockUploadsWithBigInt = [
      { id: 'upload1', fileSize: BigInt(1024), uploadedAt: new Date() },
    ];

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploadsWithBigInt,
      pagination: { total: 1, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // BigInt should be converted to string
    expect(typeof data.analytics.uploads[0].fileSize).toBe('string');
  });

  it('handles database errors gracefully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    mockDatabaseStorage.getUploadsByUser.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch analytics');
    expect(data.details).toBe('Database error');
  });

  it('handles null and undefined values in stringifyBigInts', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    const mockUploadsWithNulls = [
      { id: 'upload1', fileSize: null, metadata: undefined, tags: [] },
    ];

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: mockUploadsWithNulls,
      pagination: { total: 1, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.analytics.uploads[0].fileSize).toBeNull();
    expect(data.analytics.uploads[0].metadata).toBeUndefined();
  });

  it('handles different timeframe parameters', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: [],
      pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});

    // Test different timeframes
    const timeframes = ['24h', '7d', '30d'];
    
    for (const timeframe of timeframes) {
      const request = new NextRequest(`http://localhost/api/analytics-optimized?timeframe=${timeframe}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDatabaseStorage.getActionItemsAnalytics).toHaveBeenCalledWith('user123', timeframe);
    }
  });

  it('handles authentication errors', async () => {
    mockGetAuthenticatedUser.mockRejectedValue(new Error('Auth error'));

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch analytics');
  });

  it('uses default values for missing query parameters', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);

    mockDatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: [],
      pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 }
    });
    mockDatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    mockDatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/analytics-optimized');
    const response = await GET(request);

    expect(response.status).toBe(200);
    // Should use default timeframe '7d' when not specified
    expect(mockDatabaseStorage.getActionItemsAnalytics).toHaveBeenCalledWith('user123', '7d');
  });
});
