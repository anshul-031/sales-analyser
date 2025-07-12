/**
 * @jest-environment node
 */
import {
  getEnhancedDatabaseUrl,
  validateDatabaseConfig,
  getConnectionInfo,
  isNeonDatabase,
  getNeonRecommendedUrl,
} from '../db-connection-config';
import { DATABASE_CONFIG } from '../constants';

describe('Database Connection Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnhancedDatabaseUrl', () => {
    it('should throw an error if DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      expect(() => getEnhancedDatabaseUrl()).toThrow('DATABASE_URL environment variable is not set');
    });

    it('should add default parameters to the URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:5432/db';
      const url = getEnhancedDatabaseUrl();
      expect(url).toContain('connect_timeout=');
      expect(url).toContain('statement_timeout=');
      expect(url).toContain('pool_timeout=');
      expect(url).toContain('pool_max=');
    });

    it('should add SSL mode for Neon databases', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host.neon.tech:5432/db';
      const url = getEnhancedDatabaseUrl();
      expect(url).toContain('sslmode=require');
    });
  });

  describe('validateDatabaseConfig', () => {
    it('should throw an error if DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL environment variable is required');
    });

    it('should throw an error for invalid protocol', () => {
      process.env.DATABASE_URL = 'http://example.com';
      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL must be a PostgreSQL connection string');
    });

    it('should throw an error if hostname is missing', () => {
      process.env.DATABASE_URL = 'postgresql:///db';
      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL must include a hostname');
    });

    it('should throw an error if database name is missing', () => {
      process.env.DATABASE_URL = 'postgresql://user@host';
      expect(() => validateDatabaseConfig()).toThrow('DATABASE_URL must include a database name');
    });

    it('should pass for a valid URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:5432/db';
      expect(() => validateDatabaseConfig()).not.toThrow();
    });
  });

  describe('getConnectionInfo', () => {
    it('should parse connection info correctly', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host.neon.tech:1234/dbname';
      const info = getConnectionInfo();
      expect(info.host).toBe('host.neon.tech');
      expect(info.database).toBe('dbname');
      expect(info.port).toBe(1234);
      expect(info.ssl).toBe(true);
      expect(info.timeout).toBe(DATABASE_CONFIG.CONNECTION_TIMEOUT);
    });
  });

  describe('isNeonDatabase', () => {
    it('should return true for Neon URLs', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host.neon.tech:5432/db';
      expect(isNeonDatabase()).toBe(true);
    });

    it('should return false for non-Neon URLs', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:5432/db';
      expect(isNeonDatabase()).toBe(false);
    });
  });

  describe('getNeonRecommendedUrl', () => {
    it('should throw an error if DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      expect(() => getNeonRecommendedUrl()).toThrow('DATABASE_URL environment variable is not set');
    });

    it('should return a URL with Neon-specific parameters', () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host.neon.tech:5432/db';
      const url = getNeonRecommendedUrl();
      expect(url).toContain('sslmode=require');
      expect(url).toContain('pool_max=10');
    });
  });
});