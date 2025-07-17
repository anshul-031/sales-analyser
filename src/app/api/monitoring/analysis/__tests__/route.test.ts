import { NextRequest } from 'next/server';
import { GET } from '../route';
import { analysisMonitor } from '@/lib/analysis-monitor';
import { getAuthenticatedUser } from '@/lib/auth';

// Mock the dependencies
jest.mock('@/lib/analysis-monitor', () => ({
  analysisMonitor: {
    getMonitoringStats: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

const mockAnalysisMonitor = analysisMonitor as jest.Mocked<typeof analysisMonitor>;
const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;

describe('/api/monitoring/analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return monitoring stats for authenticated user', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockStats = {
      totalInProgress: 3,
      byStage: {
        transcribing: 1,
        analyzing: 2,
      },
      longestRunning: {
        id: 'analysis123',
        filename: 'call.mp3',
        elapsedTime: 120000,
      },
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAnalysisMonitor.getMonitoringStats.mockReturnValue(mockStats);

    const request = new NextRequest('http://localhost:3000/api/monitoring/analysis', {
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
      data: mockStats,
    });

    expect(mockGetAuthenticatedUser).toHaveBeenCalledWith(request);
    expect(mockAnalysisMonitor.getMonitoringStats).toHaveBeenCalled();
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/monitoring/analysis', {
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
    expect(mockAnalysisMonitor.getMonitoringStats).not.toHaveBeenCalled();
  });

  it('should handle authentication errors', async () => {
    mockGetAuthenticatedUser.mockRejectedValue(new Error('Auth service error'));

    const request = new NextRequest('http://localhost:3000/api/monitoring/analysis', {
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
      error: 'Failed to retrieve monitoring statistics',
    });
  });

  it('should handle monitoring service errors', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAnalysisMonitor.getMonitoringStats.mockImplementation(() => {
      throw new Error('Monitoring service error');
    });

    const request = new NextRequest('http://localhost:3000/api/monitoring/analysis', {
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
      error: 'Failed to retrieve monitoring statistics',
    });
  });

  it('should return empty stats when no analyses in progress', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com', isEmailVerified: true };
    const mockStats = {
      totalInProgress: 0,
      byStage: {},
      longestRunning: null,
    };

    mockGetAuthenticatedUser.mockResolvedValue(mockUser);
    mockAnalysisMonitor.getMonitoringStats.mockReturnValue(mockStats);

    const request = new NextRequest('http://localhost:3000/api/monitoring/analysis', {
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
      data: mockStats,
    });
  });
});
