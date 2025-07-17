import { jest } from '@jest/globals';

// Mock the database and utils
jest.mock('../db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
    upload: {
      findMany: jest.fn(),
    },
    analysis: {
      findMany: jest.fn(),
    },
    analysisInsight: {
      findMany: jest.fn(),
    },
    callMetrics: {
      findMany: jest.fn(),
    },
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

const { prisma, connectToDatabase, disconnectFromDatabase } = require('../db');
const { Logger } = require('../utils');

describe('debug-db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should execute debug database function successfully', async () => {
    // Setup mocks
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    
    prisma.user.findMany.mockResolvedValue([
      { id: 'user1', email: 'test@example.com', isEmailVerified: true },
    ]);
    
    prisma.upload.findMany.mockImplementation((query: any) => {
      if (query?.where?.userId) {
        // User-specific query
        return Promise.resolve([
          {
            id: 'upload1',
            filename: 'test.mp3',
            originalName: 'Test Audio.mp3',
            fileSize: BigInt(1024000),
            mimeType: 'audio/mpeg',
            userId: 'demo-user-001',
            analyses: [
              {
                id: 'analysis1',
                status: 'COMPLETED',
                insights: [{ id: 'insight1', content: 'Test insight' }],
                callMetrics: [{ id: 'metric1', duration: 300 }],
              },
            ],
          },
        ]);
      }
      // General query
      return Promise.resolve([
        {
          id: 'upload1',
          filename: 'test.mp3',
          fileSize: BigInt(1024000),
          mimeType: 'audio/mpeg',
        },
      ]);
    });
    
    prisma.analysis.findMany.mockResolvedValue([
      { id: 'analysis1', status: 'COMPLETED', uploadId: 'upload1' },
    ]);
    
    prisma.analysisInsight.findMany.mockResolvedValue([
      { id: 'insight1', content: 'Test insight', analysisId: 'analysis1' },
    ]);
    
    prisma.callMetrics.findMany.mockResolvedValue([
      { id: 'metric1', duration: 300, analysisId: 'analysis1' },
    ]);

    // Import and execute the debug function
    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    try {
      // Since the file executes immediately, we import it to trigger execution
      jest.isolateModules(() => {
        require('../debug-db');
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectToDatabase).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('[Debug] Starting database debug session...');
      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(prisma.upload.findMany).toHaveBeenCalled();
      expect(prisma.analysis.findMany).toHaveBeenCalled();
      expect(prisma.analysisInsight.findMany).toHaveBeenCalled();
      expect(prisma.callMetrics.findMany).toHaveBeenCalled();
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle database connection failure', async () => {
    connectToDatabase.mockResolvedValue(false);
    disconnectFromDatabase.mockResolvedValue(undefined);

    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    try {
      jest.isolateModules(() => {
        require('../debug-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectToDatabase).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith('[Debug] Database debug failed:', expect.any(Error));
      expect(disconnectFromDatabase).toHaveBeenCalled();
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle database query errors', async () => {
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    prisma.user.findMany.mockRejectedValue(new Error('Database error'));

    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    try {
      jest.isolateModules(() => {
        require('../debug-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectToDatabase).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith('[Debug] Database debug failed:', expect.any(Error));
      expect(disconnectFromDatabase).toHaveBeenCalled();
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle BigInt serialization correctly', async () => {
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    
    const bigIntData = [
      { id: 'upload1', fileSize: BigInt('9007199254740991') }
    ];
    
    prisma.user.findMany.mockResolvedValue([]);
    prisma.upload.findMany.mockResolvedValue(bigIntData);
    prisma.analysis.findMany.mockResolvedValue([]);
    prisma.analysisInsight.findMany.mockResolvedValue([]);
    prisma.callMetrics.findMany.mockResolvedValue([]);

    const originalProcessExit = process.exit;
    process.exit = jest.fn() as any;

    try {
      jest.isolateModules(() => {
        require('../debug-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that console.log was called with serialized BigInt
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'Uploads data:',
        expect.stringContaining('"9007199254740991"')
      );
      
    } finally {
      process.exit = originalProcessExit;
    }
  });

  it('should handle process exit on unexpected errors', async () => {
    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn() as any;
    process.exit = mockProcessExit;

    // Mock an error in the main execution
    connectToDatabase.mockResolvedValue(true);
    disconnectFromDatabase.mockResolvedValue(undefined);
    prisma.user.findMany.mockRejectedValue(new Error('Unexpected error'));

    try {
      jest.isolateModules(() => {
        require('../debug-db');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // The error should be caught by the debug function's try-catch
      expect(consoleSpy.error).toHaveBeenCalledWith('Error details:', expect.any(Error));
      expect(Logger.error).toHaveBeenCalledWith('[Debug] Database debug failed:', expect.any(Error));
      
    } finally {
      process.exit = originalProcessExit;
    }
  });
});
