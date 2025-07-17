import { jest } from '@jest/globals';

// Mock the database and utils
jest.mock('../db', () => ({
  DatabaseStorage: {
    createUser: jest.fn(),
    createUpload: jest.fn(),
    createAnalysis: jest.fn(),
    updateAnalysis: jest.fn(),
    createMultipleInsights: jest.fn(),
    getUploadsByUser: jest.fn(),
    getAnalysesByUser: jest.fn(),
    getActionItemsAnalytics: jest.fn(),
    getGlobalStats: jest.fn(),
    clearUserData: jest.fn(),
  },
  connectToDatabase: jest.fn(),
  disconnectFromDatabase: jest.fn(),
}));

jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

const { DatabaseStorage, connectToDatabase, disconnectFromDatabase } = require('../db');
const { Logger } = require('../utils');

describe('test-db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should execute database test successfully', async () => {
    // Setup mocks
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    
    const mockUser = { id: 'test-user-12345', email: 'test@example.com' };
    const mockUpload = { 
      id: 'upload-123', 
      filename: 'test-audio.mp3',
      userId: 'test-user-12345' 
    };
    const mockAnalysis = { 
      id: 'analysis-123', 
      status: 'PENDING',
      uploadId: 'upload-123',
      userId: 'test-user-12345' 
    };
    const mockUpdatedAnalysis = { 
      ...mockAnalysis, 
      status: 'COMPLETED',
      transcription: 'This is a test transcription'
    };
    
    DatabaseStorage.createUser.mockResolvedValue(mockUser);
    DatabaseStorage.createUpload.mockResolvedValue(mockUpload);
    DatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);
    DatabaseStorage.updateAnalysis.mockResolvedValue(mockUpdatedAnalysis);
    DatabaseStorage.createMultipleInsights.mockResolvedValue(undefined);
    
    DatabaseStorage.getUploadsByUser.mockResolvedValue({
      uploads: [mockUpload],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
    });
    
    DatabaseStorage.getAnalysesByUser.mockResolvedValue([mockAnalysis]);
    DatabaseStorage.getActionItemsAnalytics.mockResolvedValue({
      totalActionItems: 5,
      completedActionItems: 3,
      completionRate: 0.6,
    });
    DatabaseStorage.getGlobalStats.mockResolvedValue({
      totalUsers: 10,
      totalUploads: 50,
      totalAnalyses: 45,
    });
    DatabaseStorage.clearUserData.mockResolvedValue(undefined);

    // Mock process.exit
    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn() as any;
    process.exit = mockProcessExit;

    try {
      // Import and execute the test function
      jest.isolateModules(() => {
        require('../test-db');
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify database operations
      expect(connectToDatabase).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('[DB Test] Starting database connection test...');
      expect(Logger.info).toHaveBeenCalledWith('[DB Test] Database connection successful');
      
      expect(DatabaseStorage.createUser).toHaveBeenCalledWith(expect.stringMatching(/^test-user-\d+$/));
      expect(DatabaseStorage.createUpload).toHaveBeenCalledWith(expect.objectContaining({
        filename: 'test-audio.mp3',
        originalName: 'test-audio.mp3',
        fileSize: 1024,
        mimeType: 'audio/mpeg',
        fileUrl: 'test/path/test-audio.mp3',
      }));
      expect(DatabaseStorage.createAnalysis).toHaveBeenCalledWith(expect.objectContaining({
        status: 'PENDING',
        analysisType: 'DEFAULT',
      }));
      expect(DatabaseStorage.updateAnalysis).toHaveBeenCalledWith(
        'analysis-123',
        expect.objectContaining({
          status: 'COMPLETED',
          transcription: 'This is a test transcription',
        })
      );
      expect(DatabaseStorage.createMultipleInsights).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          category: 'sentiment',
          key: 'overall_sentiment',
          value: 'positive',
          confidence: 0.95,
        }),
        expect.objectContaining({
          category: 'summary',
          key: 'call_summary',
          value: 'This was a successful test call',
        }),
      ]));

      expect(DatabaseStorage.getUploadsByUser).toHaveBeenCalled();
      expect(DatabaseStorage.getAnalysesByUser).toHaveBeenCalled();
      expect(DatabaseStorage.getActionItemsAnalytics).toHaveBeenCalled();
      expect(DatabaseStorage.getGlobalStats).toHaveBeenCalled();
      expect(DatabaseStorage.clearUserData).toHaveBeenCalled();
      expect(disconnectFromDatabase).toHaveBeenCalled();

      expect(Logger.info).toHaveBeenCalledWith('[DB Test] All database operations completed successfully!');
      expect(Logger.info).toHaveBeenCalledWith('[DB Test] Cleaned up test data');
      
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Database test completed successfully');
      expect(mockProcessExit).toHaveBeenCalledWith(0);
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle database connection failure', async () => {
    connectToDatabase.mockResolvedValue(false);
    disconnectFromDatabase.mockResolvedValue(undefined);

    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn() as any;
    process.exit = mockProcessExit;

    try {
      jest.isolateModules(() => {
        require('../test-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectToDatabase).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith('[DB Test] Database test failed:', expect.any(Error));
      expect(disconnectFromDatabase).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Database test failed:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle database operation errors', async () => {
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    DatabaseStorage.createUser.mockRejectedValue(new Error('Database operation failed'));

    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn() as any;
    process.exit = mockProcessExit;

    try {
      jest.isolateModules(() => {
        require('../test-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectToDatabase).toHaveBeenCalled();
      expect(DatabaseStorage.createUser).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith('[DB Test] Database test failed:', expect.any(Error));
      expect(disconnectFromDatabase).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Database test failed:', expect.any(Error));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle cleanup operation errors gracefully', async () => {
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    
    const mockUser = { id: 'test-user-12345', email: 'test@example.com' };
    const mockUpload = { id: 'upload-123', filename: 'test-audio.mp3' };
    const mockAnalysis = { id: 'analysis-123', status: 'PENDING' };
    
    DatabaseStorage.createUser.mockResolvedValue(mockUser);
    DatabaseStorage.createUpload.mockResolvedValue(mockUpload);
    DatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);
    DatabaseStorage.updateAnalysis.mockResolvedValue(mockAnalysis);
    DatabaseStorage.createMultipleInsights.mockResolvedValue(undefined);
    DatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: [], pagination: {} });
    DatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    DatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});
    DatabaseStorage.getGlobalStats.mockResolvedValue({});
    DatabaseStorage.clearUserData.mockRejectedValue(new Error('Cleanup failed'));

    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn() as any;
    process.exit = mockProcessExit;

    try {
      jest.isolateModules(() => {
        require('../test-db');
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(DatabaseStorage.clearUserData).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith('[DB Test] Database test failed:', expect.any(Error));
      expect(disconnectFromDatabase).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should properly pass user ID between operations', async () => {
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    
    const testUserId = 'test-user-12345';
    const mockUser = { id: testUserId, email: 'test@example.com' };
    const mockUpload = { id: 'upload-123', filename: 'test-audio.mp3' };
    const mockAnalysis = { id: 'analysis-123', status: 'PENDING' };
    
    DatabaseStorage.createUser.mockResolvedValue(mockUser);
    DatabaseStorage.createUpload.mockResolvedValue(mockUpload);
    DatabaseStorage.createAnalysis.mockResolvedValue(mockAnalysis);
    DatabaseStorage.updateAnalysis.mockResolvedValue(mockAnalysis);
    DatabaseStorage.createMultipleInsights.mockResolvedValue(undefined);
    DatabaseStorage.getUploadsByUser.mockResolvedValue({ uploads: [], pagination: {} });
    DatabaseStorage.getAnalysesByUser.mockResolvedValue([]);
    DatabaseStorage.getActionItemsAnalytics.mockResolvedValue({});
    DatabaseStorage.getGlobalStats.mockResolvedValue({});
    DatabaseStorage.clearUserData.mockResolvedValue(undefined);

    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    try {
      jest.isolateModules(() => {
        require('../test-db');
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify user ID is used consistently
      const createUploadCall = DatabaseStorage.createUpload.mock.calls[0][0];
      const createAnalysisCall = DatabaseStorage.createAnalysis.mock.calls[0][0];
      
      expect(createUploadCall.userId).toMatch(/^test-user-\d+$/);
      expect(createAnalysisCall.userId).toMatch(/^test-user-\d+$/);
      expect(createAnalysisCall.uploadId).toBe('upload-123');
      
      expect(DatabaseStorage.getUploadsByUser).toHaveBeenCalledWith(expect.stringMatching(/^test-user-\d+$/));
      expect(DatabaseStorage.getAnalysesByUser).toHaveBeenCalledWith(expect.stringMatching(/^test-user-\d+$/));
      expect(DatabaseStorage.getActionItemsAnalytics).toHaveBeenCalledWith(expect.stringMatching(/^test-user-\d+$/), '7d');
      expect(DatabaseStorage.clearUserData).toHaveBeenCalledWith(expect.stringMatching(/^test-user-\d+$/));
      
    } finally {
      process.exit = originalProcessExit;
    }
  });
});
