import { prisma, connectToDatabase, disconnectFromDatabase, DatabaseStorage } from '../db';
import { Logger } from '../utils';

jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $use: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    upload: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    analysis: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    analysisInsight: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    callMetrics: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrismaClient),
    AnalysisStatus: {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
    },
  };
});

jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Database Connection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connectToDatabase should connect successfully', async () => {
    (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
    const result = await connectToDatabase();
    expect(result).toBe(true);
    expect(Logger.info).toHaveBeenCalledWith('[Database] Connected to PostgreSQL database');
  });

  it('connectToDatabase should handle connection failure', async () => {
    const error = new Error('Connection failed');
    (prisma.$connect as jest.Mock).mockRejectedValue(error);
    const result = await connectToDatabase();
    expect(result).toBe(false);
    expect(Logger.error).toHaveBeenCalledWith('[Database] Failed to connect to PostgreSQL:', error);
  });

  it('disconnectFromDatabase should disconnect successfully', async () => {
    (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
    await disconnectFromDatabase();
    expect(Logger.info).toHaveBeenCalledWith('[Database] Disconnected from PostgreSQL database');
  });

  it('disconnectFromDatabase should handle disconnection error', async () => {
    const error = new Error('Disconnection failed');
    (prisma.$disconnect as jest.Mock).mockRejectedValue(error);
    await disconnectFromDatabase();
    expect(Logger.error).toHaveBeenCalledWith('[Database] Error disconnecting from database:', error);
  });
});

describe('DatabaseStorage', () => {
  const mockUser = { id: 'user1', email: 'test@example.com' };
  const mockUpload = {
    id: 'upload1',
    filename: 'test.wav',
    originalName: 'original.wav',
    fileSize: 12345,
    mimeType: 'audio/wav',
    fileUrl: 'http://example.com/test.wav',
    userId: 'user1',
  };
  const mockAnalysis = {
    id: 'analysis1',
    status: 'COMPLETED',
    analysisType: 'DEFAULT',
    userId: 'user1',
    uploadId: 'upload1',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Operations', () => {
    it('createUser should find an existing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      const user = await DatabaseStorage.createUser('user1');
      expect(user).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' } });
    });

    it('createUser should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(DatabaseStorage.createUser('user1')).rejects.toThrow('User not found. Please register first.');
    });
  });

  describe('Upload Operations', () => {
    beforeEach(() => {
      // Mock createUser for upload operations
      jest.spyOn(DatabaseStorage, 'createUser').mockResolvedValue(mockUser as any);
    });

    it('createUpload should create a new upload', async () => {
      (prisma.upload.create as jest.Mock).mockResolvedValue(mockUpload);
      const newUpload = await DatabaseStorage.createUpload({
        filename: 'test.wav',
        originalName: 'original.wav',
        fileSize: 12345,
        mimeType: 'audio/wav',
        fileUrl: 'http://example.com/test.wav',
        userId: 'user1',
      });
      expect(newUpload).toEqual(mockUpload);
    });

    it('getUploadById should retrieve an upload', async () => {
      (prisma.upload.findUnique as jest.Mock).mockResolvedValue(mockUpload);
      const upload = await DatabaseStorage.getUploadById('upload1');
      expect(upload).toEqual(mockUpload);
    });

    it('getUploadsByUser should retrieve uploads', async () => {
        (prisma.upload.count as jest.Mock).mockResolvedValue(1);
        (prisma.upload.findMany as jest.Mock).mockResolvedValue([mockUpload]);
        (prisma.analysis.findMany as jest.Mock).mockResolvedValue([mockAnalysis]);
        const result = await DatabaseStorage.getUploadsByUser('user1');
        expect(result.uploads).toHaveLength(1);
        expect((result.uploads[0] as any).analyses).toBeDefined();
        expect(result.pagination).toBeDefined();
        expect(result.pagination.total).toBe(1);
      });

    it('deleteUpload should delete an upload', async () => {
      (prisma.upload.delete as jest.Mock).mockResolvedValue(mockUpload);
      const deleted = await DatabaseStorage.deleteUpload('upload1');
      expect(deleted).toEqual(mockUpload);
    });
  });

  describe('Analysis Operations', () => {
    beforeEach(() => {
        jest.spyOn(DatabaseStorage, 'createUser').mockResolvedValue(mockUser as any);
    });

    it('createAnalysis should create a new analysis', async () => {
        (prisma.analysis.create as jest.Mock).mockResolvedValue(mockAnalysis);
        const newAnalysis = await DatabaseStorage.createAnalysis({
            analysisType: 'DEFAULT',
            userId: 'user1',
            uploadId: 'upload1',
        });
        expect(newAnalysis).toEqual(mockAnalysis);
    });

    it('updateAnalysis should update an analysis', async () => {
        (prisma.analysis.update as jest.Mock).mockResolvedValue({ ...mockAnalysis, status: 'COMPLETED' });
        const updated = await DatabaseStorage.updateAnalysis('analysis1', { status: 'COMPLETED' });
        expect(updated.status).toBe('COMPLETED');
    });

    it('getAnalysisById should retrieve an analysis', async () => {
        (prisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis);
        const analysis = await DatabaseStorage.getAnalysisById('analysis1');
        expect(analysis).toEqual(mockAnalysis);
    });

    it('getAnalysesByUser should retrieve analyses', async () => {
        (prisma.analysis.findMany as jest.Mock).mockResolvedValue([mockAnalysis]);
        const analyses = await DatabaseStorage.getAnalysesByUser('user1');
        expect(analyses).toHaveLength(1);
    });

    it('getAnalysesByUploadId should retrieve analyses', async () => {
        (prisma.analysis.findMany as jest.Mock).mockResolvedValue([mockAnalysis]);
        const analyses = await DatabaseStorage.getAnalysesByUploadId('upload1');
        expect(analyses).toHaveLength(1);
    });

    it('getAnalysesByStatus should retrieve analyses', async () => {
        (prisma.analysis.findMany as jest.Mock).mockResolvedValue([mockAnalysis]);
        const analyses = await DatabaseStorage.getAnalysesByStatus('COMPLETED' as any);
        expect(analyses).toHaveLength(1);
    });
  });

  describe('Insight and Metrics Operations', () => {
    const mockInsight = { id: 'insight1', analysisId: 'analysis1', category: 'test', key: 'test', value: 'test' };
    const mockMetrics = { id: 'metrics1', analysisId: 'analysis1', duration: 120 };

    it('createInsight should create an insight', async () => {
        (prisma.analysisInsight.create as jest.Mock).mockResolvedValue(mockInsight);
        const insight = await DatabaseStorage.createInsight(mockInsight);
        expect(insight).toEqual(mockInsight);
    });

    it('createMultipleInsights should create multiple insights', async () => {
        (prisma.analysisInsight.createMany as jest.Mock).mockResolvedValue({ count: 1 });
        const result = await DatabaseStorage.createMultipleInsights([mockInsight]);
        expect(result.count).toBe(1);
    });

    it('createCallMetrics should create metrics', async () => {
        (prisma.callMetrics.create as jest.Mock).mockResolvedValue(mockMetrics);
        const metrics = await DatabaseStorage.createCallMetrics({ analysisId: 'analysis1' });
        expect(metrics).toEqual(mockMetrics);
    });

    it('updateCallMetrics should update metrics', async () => {
        (prisma.callMetrics.upsert as jest.Mock).mockResolvedValue(mockMetrics);
        const metrics = await DatabaseStorage.updateCallMetrics('analysis1', { duration: 120 });
        expect(metrics).toEqual(mockMetrics);
    });

    it('getAnalysisWithInsights should retrieve analysis with insights', async () => {
        (prisma.analysis.findUnique as jest.Mock).mockResolvedValue({ ...mockAnalysis, insights: [mockInsight] });
        const analysis = await DatabaseStorage.getAnalysisWithInsights('analysis1');
        expect(analysis?.insights).toHaveLength(1);
    });
  });
});