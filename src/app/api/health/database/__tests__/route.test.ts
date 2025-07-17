import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getDatabaseStatus, databaseMonitor } from '@/lib/db-monitor';

// Mock the database monitor module
jest.mock('@/lib/db-monitor', () => ({
  getDatabaseStatus: jest.fn(),
  databaseMonitor: {
    getDetailedStatus: jest.fn(),
    testDatabaseOperations: jest.fn(),
    performHealthCheck: jest.fn(),
  },
}));

const mockGetDatabaseStatus = getDatabaseStatus as jest.MockedFunction<typeof getDatabaseStatus>;
const mockDatabaseMonitor = databaseMonitor as jest.Mocked<typeof databaseMonitor>;

describe('/api/health/database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when database connection succeeds', async () => {
    // Mock successful database status
    const mockTimestamp = new Date('2023-01-01T00:00:00.000Z');
    
    mockGetDatabaseStatus.mockResolvedValue({
      health: {
        isHealthy: true,
        latency: 50,
        error: undefined,
        timestamp: mockTimestamp,
        connectionInfo: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          ssl: false,
          timeout: 30000,
        },
      },
      metrics: {
        totalQueries: 100,
        successfulQueries: 98,
        failedQueries: 2,
        averageLatency: 45.5,
        uptime: 3600,
        lastHealthCheck: mockTimestamp,
      },
      recommendations: [],
    });

    mockDatabaseMonitor.getDetailedStatus.mockResolvedValue({
      health: {
        isHealthy: true,
        latency: 50,
        error: undefined,
        timestamp: mockTimestamp,
        connectionInfo: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          ssl: false,
          timeout: 30000,
        },
      },
      metrics: {
        totalQueries: 100,
        successfulQueries: 98,
        failedQueries: 2,
        averageLatency: 45.5,
        uptime: 3600,
        lastHealthCheck: mockTimestamp,
      },
      connectionInfo: {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        ssl: false,
        timeout: 30000,
      },
      isNeon: false,
    });

    mockDatabaseMonitor.testDatabaseOperations.mockResolvedValue({
      success: true,
      operations: [
        {
          name: 'Health Check',
          success: true,
          duration: 50,
          error: undefined,
        },
        {
          name: 'Simple Query',
          success: true,
          duration: 30,
          error: undefined,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/health/database');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      timestamp: expect.any(String),
      status: expect.objectContaining({
        health: expect.objectContaining({
          isHealthy: true,
          latency: 50,
        }),
        detailed: expect.objectContaining({
          health: expect.objectContaining({
            isHealthy: true,
            latency: 50,
          }),
          metrics: expect.objectContaining({
            totalQueries: 100,
            successfulQueries: 98,
          }),
        }),
        tests: expect.objectContaining({
          success: true,
          operations: expect.any(Array),
        }),
      }),
    });

    expect(mockGetDatabaseStatus).toHaveBeenCalledTimes(1);
    expect(mockDatabaseMonitor.getDetailedStatus).toHaveBeenCalledTimes(1);
    expect(mockDatabaseMonitor.testDatabaseOperations).toHaveBeenCalledTimes(1);
  });

  it('should return error response when database status check fails', async () => {
    const testError = new Error('Database connection failed');
    mockGetDatabaseStatus.mockRejectedValue(testError);

    const request = new NextRequest('http://localhost:3000/api/health/database');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Health check failed',
      details: 'Database connection failed',
      timestamp: expect.any(String),
    });

    expect(mockGetDatabaseStatus).toHaveBeenCalledTimes(1);
  });

  it('should handle database monitor errors gracefully', async () => {
    const mockTimestamp = new Date('2023-01-01T00:00:00.000Z');
    
    mockGetDatabaseStatus.mockResolvedValue({
      health: {
        isHealthy: false,
        latency: 0,
        error: 'Connection timeout',
        timestamp: mockTimestamp,
        connectionInfo: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          ssl: false,
          timeout: 30000,
        },
      },
      metrics: {
        totalQueries: 5,
        successfulQueries: 0,
        failedQueries: 5,
        averageLatency: 0,
        uptime: 100,
        lastHealthCheck: mockTimestamp,
      },
      recommendations: [],
    });

    mockDatabaseMonitor.getDetailedStatus.mockRejectedValue(new Error('Monitor failed'));
    mockDatabaseMonitor.testDatabaseOperations.mockRejectedValue(new Error('Test failed'));

    const request = new NextRequest('http://localhost:3000/api/health/database');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Health check failed',
      details: expect.any(String),
      timestamp: expect.any(String),
    });

    expect(mockGetDatabaseStatus).toHaveBeenCalledTimes(1);
  });

  it('should handle unknown errors gracefully', async () => {
    mockGetDatabaseStatus.mockRejectedValue('Unknown error string');

    const request = new NextRequest('http://localhost:3000/api/health/database');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      error: 'Health check failed',
      details: 'Unknown error',
      timestamp: expect.any(String),
    });
  });
});
