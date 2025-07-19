import { DataMigration } from '../migration';

// Mock Logger
jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('DataMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migrateFromFileStorage', () => {
    it('should return migration completion message', async () => {
      const result = await DataMigration.migrateFromFileStorage();

      expect(result).toEqual({
        migratedUploads: 0,
        migratedAnalyses: 0,
        message: 'Local file storage has been removed. All operations now use database storage.',
      });
    });

    it('should log migration completion', async () => {
      const { Logger } = require('../utils');
      
      await DataMigration.migrateFromFileStorage();

      expect(Logger.info).toHaveBeenCalledWith('[Migration] Local file storage has been removed - no migration needed');
      expect(Logger.info).toHaveBeenCalledWith('[Migration] All data operations now use database storage');
    });
  });

  describe('getStatus', () => {
    it('should return completed status for database-only storage', async () => {
      const result = await DataMigration.getStatus();

      expect(result).toEqual({
        status: 'completed',
        storageType: 'database',
        fileStorageRemoved: true,
        message: 'System now uses database storage exclusively',
      });
    });

    it('should log status check', async () => {
      const { Logger } = require('../utils');
      
      await DataMigration.getStatus();

      expect(Logger.info).toHaveBeenCalledWith('[Migration] Migration status check');
    });
  });
});
