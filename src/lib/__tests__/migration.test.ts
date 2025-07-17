import { DataMigration } from '../migration';

// Mock database and file system dependencies
jest.mock('../db', () => ({
  DatabaseStorage: {
    createUpload: jest.fn(),
    createAnalysis: jest.fn(),
    getUpload: jest.fn(),
    getAnalysis: jest.fn(),
    deleteUpload: jest.fn(),
    deleteAnalysis: jest.fn(),
  }
}));

jest.mock('../file-storage', () => ({
  FileStorage: {
    getStats: jest.fn(),
    getAllUploads: jest.fn(),
    getAllAnalyses: jest.fn(),
    getUploadsByUser: jest.fn(),
    getAnalysesByUser: jest.fn(),
    deleteUserData: jest.fn(),
  }
}));

jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

const mockDbStorage = require('../db').DatabaseStorage;
const mockFileStorage = require('../file-storage').FileStorage;
const mockLogger = require('../utils').Logger;

describe('DataMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migrateFromFileStorage', () => {
    it('should start migration and log properly', async () => {
      mockFileStorage.getStats.mockResolvedValue({
        totalUploads: 0,
        totalAnalyses: 0,
        totalUsers: 0
      });

      // Mock the private methods that will be called
      (DataMigration as any).getAllUploadsFromFileStorage = jest.fn().mockResolvedValue([]);
      (DataMigration as any).getAllAnalysesFromFileStorage = jest.fn().mockResolvedValue([]);

      const result = await DataMigration.migrateFromFileStorage();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Starting data migration from file storage to PostgreSQL')
      );
    });

    it('should handle migration errors gracefully', async () => {
      mockFileStorage.getStats.mockRejectedValue(new Error('File storage error'));

      await expect(DataMigration.migrateFromFileStorage()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      mockFileStorage.getStats.mockResolvedValue({ 
        totalUploads: 1, 
        totalAnalyses: 0, 
        totalUsers: 1 
      });

      (DataMigration as any).getAllUploadsFromFileStorage = jest.fn().mockResolvedValue([
        { id: '1', userId: 'user1', filename: 'test.mp3' }
      ]);
      (DataMigration as any).getAllAnalysesFromFileStorage = jest.fn().mockResolvedValue([]);

      mockDbStorage.createUpload.mockRejectedValue(new Error('Database connection failed'));

      // The migration should still complete even with some failures
      const result = await DataMigration.migrateFromFileStorage();
      
      expect(result.success).toBe(true);
      
      // Check that error was logged with proper format
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Migration] Failed to migrate upload:', '1', expect.any(Error)
      );
    });
  });

  describe('basic functionality', () => {
    it('should create instance', () => {
      const dataMigration = new DataMigration();
      expect(dataMigration).toBeInstanceOf(DataMigration);
    });

    it('should have static migration method', () => {
      expect(typeof DataMigration.migrateFromFileStorage).toBe('function');
    });
  });

  describe('logging and error handling', () => {
    it('should log migration progress', async () => {
      mockFileStorage.getStats.mockResolvedValue({
        totalUploads: 1,
        totalAnalyses: 1,
        totalUsers: 1
      });

      (DataMigration as any).getAllUploadsFromFileStorage = jest.fn().mockResolvedValue([
        { id: '1', userId: 'user1', filename: 'test.mp3' }
      ]);
      (DataMigration as any).getAllAnalysesFromFileStorage = jest.fn().mockResolvedValue([
        { id: '1', userId: 'user1', uploadId: '1', status: 'COMPLETED' }
      ]);

      mockDbStorage.createUpload.mockResolvedValue({ id: 'db1' });
      mockDbStorage.createAnalysis.mockResolvedValue({ id: 'dba1' });

      await DataMigration.migrateFromFileStorage();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[Migration] Starting data migration from file storage to PostgreSQL')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[Migration] Found file storage data:',
        expect.objectContaining({
          totalUploads: 1,
          totalAnalyses: 1,
          totalUsers: 1
        })
      );
    });

    it('should log errors with proper context', async () => {
      const error = new Error('Test migration error');
      mockFileStorage.getStats.mockRejectedValue(error);

      await expect(DataMigration.migrateFromFileStorage()).rejects.toThrow('Test migration error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Migration] Data migration failed:',
        error
      );
    });
  });
});
