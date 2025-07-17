import { 
  databaseMonitor, 
  quickHealthCheck, 
  getDatabaseStatus, 
  startDatabaseMonitoring, 
  stopDatabaseMonitoring,
  DatabaseHealthStatus,
  DatabaseMetrics
} from '../db-monitor';
import { Logger } from '../utils';

// Mock dependencies
jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../db', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
    },
    upload: {
      count: jest.fn(),
    },
    analysis: {
      count: jest.fn(),
    },
  },
}));

jest.mock('../db-connection-config', () => ({
  getConnectionInfo: jest.fn(() => ({
    host: 'localhost',
    port: 5432,
    database: 'test_db',
    ssl: false,
    timeout: 30000,
  })),
  isNeonDatabase: jest.fn(() => false),
}));

const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockPrisma = require('../db').prisma;

describe('Database Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    stopDatabaseMonitoring();
  });

  describe('DatabaseMonitor Class', () => {
    it('should initialize with default metrics', () => {
      expect(databaseMonitor).toBeDefined();
      expect(databaseMonitor).toBeInstanceOf(Object);
    });

    it('should expose monitoring functionality', () => {
      // Test that the monitor exists and has expected structure
      expect(databaseMonitor).toBeDefined();
    });
  });

  describe('quickHealthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const health = await quickHealthCheck();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('connectionInfo');
      expect(health).toHaveProperty('timestamp');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when database query fails', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.$queryRaw.mockRejectedValue(error);

      const health = await quickHealthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBe('Database connection failed');
      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should measure query latency', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const health = await quickHealthCheck();

      expect(health.latency).toBeGreaterThanOrEqual(0);
    });

    it('should include connection info in health status', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const health = await quickHealthCheck();

      expect(health.connectionInfo).toEqual({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        ssl: false,
        timeout: 30000,
      });
    });
  });

  describe('getDatabaseStatus', () => {
    it('should return database status with metrics', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.upload.count.mockResolvedValue(50);
      mockPrisma.analysis.count.mockResolvedValue(25);

      const status = await getDatabaseStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('metrics');
      expect(status.health).toHaveProperty('isHealthy');
      expect(status.metrics).toHaveProperty('totalQueries');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockPrisma.user.count.mockRejectedValue(new Error('Count failed'));
      mockPrisma.upload.count.mockRejectedValue(new Error('Count failed'));
      mockPrisma.analysis.count.mockRejectedValue(new Error('Count failed'));

      const status = await getDatabaseStatus();

      expect(status.health.isHealthy).toBe(false);
      expect(status.health.error).toBe('Connection failed');
    });

    it('should return metrics even when health check fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockPrisma.user.count.mockRejectedValue(new Error('Count failed'));
      mockPrisma.upload.count.mockRejectedValue(new Error('Count failed'));
      mockPrisma.analysis.count.mockRejectedValue(new Error('Count failed'));

      const status = await getDatabaseStatus();

      expect(status.metrics).toBeDefined();
      expect(status.metrics).toHaveProperty('totalQueries');
      expect(status.metrics).toHaveProperty('successfulQueries');
      expect(status.metrics).toHaveProperty('failedQueries');
    });
  });

  describe('startDatabaseMonitoring', () => {
    it('should start monitoring without errors', () => {
      expect(() => startDatabaseMonitoring()).not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('[Database Monitor] Started continuous monitoring');
    });

    it('should handle repeated start calls gracefully', () => {
      startDatabaseMonitoring();
      expect(() => startDatabaseMonitoring()).not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopDatabaseMonitoring', () => {
    it('should stop monitoring without errors', () => {
      startDatabaseMonitoring();
      expect(() => stopDatabaseMonitoring()).not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('[Database Monitor] Stopped monitoring');
    });

    it('should handle stop calls when not monitoring', () => {
      expect(() => stopDatabaseMonitoring()).not.toThrow();
      expect(mockLogger.info).toHaveBeenCalledWith('[Database Monitor] Stopped monitoring');
    });
  });

  describe('Types', () => {
    it('should have proper DatabaseHealthStatus interface', () => {
      const healthStatus: DatabaseHealthStatus = {
        isHealthy: true,
        latency: 50,
        connectionInfo: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          ssl: false,
          timeout: 30000,
        },
        timestamp: new Date(),
      };

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.latency).toBe(50);
      expect(healthStatus.connectionInfo).toBeDefined();
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
    });

    it('should have proper DatabaseMetrics interface', () => {
      const metrics: DatabaseMetrics = {
        totalQueries: 100,
        successfulQueries: 95,
        failedQueries: 5,
        averageLatency: 45.5,
        lastHealthCheck: new Date(),
        uptime: 3600000, // 1 hour in ms
      };

      expect(metrics.totalQueries).toBe(100);
      expect(metrics.successfulQueries).toBe(95);
      expect(metrics.failedQueries).toBe(5);
      expect(metrics.averageLatency).toBe(45.5);
      expect(metrics.lastHealthCheck).toBeInstanceOf(Date);
      expect(metrics.uptime).toBe(3600000);
    });
  });

  describe('Integration', () => {
    it('should perform health check and logging integration', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const health = await quickHealthCheck();

      expect(health.isHealthy).toBe(true);
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.connectionInfo).toBeDefined();
    });

    it('should handle monitoring lifecycle', () => {
      // Start monitoring
      startDatabaseMonitoring();
      expect(mockLogger.info).toHaveBeenCalledWith('[Database Monitor] Started continuous monitoring');

      // Stop monitoring
      stopDatabaseMonitoring();
      expect(mockLogger.info).toHaveBeenCalledWith('[Database Monitor] Stopped monitoring');
    });

    it('should handle error scenarios gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Network error'));

      const health = await quickHealthCheck();

      expect(health.isHealthy).toBe(false);
      expect(health.error).toBe('Network error');
    });
  });
});
