import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../route';

jest.mock('@/lib/db', () => ({
  prisma: {
    analysisInsight: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      createMany: jest.fn(),
    },
    analysis: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { Logger } from '@/lib/utils';
import { prisma } from '@/lib/db';

// Get references to the mocked functions
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/insights API Route', () => {
  const mockLogger = Logger as jest.Mocked<typeof Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/insights', () => {
    it('should return 400 if userId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/insights');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User ID is required');
    });

    it('should fetch insights successfully', async () => {
      const mockInsights = [
        {
          id: 'insight1',
          analysisId: 'analysis1',
          category: 'sentiment',
          key: 'overall_sentiment',
          value: 'positive',
          confidence: 0.85,
          analysis: {
            id: 'analysis1',
            upload: {
              id: 'upload1',
              filename: 'test.mp3',
              uploadedAt: new Date('2023-01-01'),
            },
            callMetrics: {
              duration: 300,
              speakerCount: 2,
            },
          },
        },
      ];

      const mockSummary = [
        { category: 'sentiment', _count: { id: 5 } },
        { category: 'topics', _count: { id: 3 } },
      ];

      (mockedPrisma.analysisInsight.findMany as jest.Mock).mockResolvedValue(mockInsights);
      (mockedPrisma.analysisInsight.groupBy as jest.Mock).mockResolvedValue(mockSummary);

      const request = new NextRequest('http://localhost:3000/api/insights?userId=user123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // The API serializes dates to strings, so we need to compare the serialized version
      const expectedInsights = [
        {
          id: 'insight1',
          analysisId: 'analysis1',
          category: 'sentiment',
          key: 'overall_sentiment',
          value: 'positive',
          confidence: 0.85,
          analysis: {
            id: 'analysis1',
            upload: {
              id: 'upload1',
              filename: 'test.mp3',
              uploadedAt: '2023-01-01T00:00:00.000Z', // Date becomes string after JSON serialization
            },
            callMetrics: {
              duration: 300,
              speakerCount: 2,
            },
          },
        },
      ];
      
      expect(data.insights).toEqual(expectedInsights);
      expect(data.summary).toEqual(mockSummary);
      expect(data.total).toBe(1);

      expect(mockedPrisma.analysisInsight.findMany).toHaveBeenCalledWith({
        where: {
          analysis: { userId: 'user123' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          analysis: {
            include: {
              upload: {
                select: {
                  id: true,
                  filename: true,
                  uploadedAt: true,
                }
              },
              callMetrics: true,
            }
          }
        }
      });

      expect(mockedPrisma.analysisInsight.groupBy).toHaveBeenCalledWith({
        by: ['category'],
        where: {
          analysis: { userId: 'user123' }
        },
        _count: {
          id: true
        }
      });
    });

    it('should filter insights by analysisId', async () => {
      (mockedPrisma.analysisInsight.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.analysisInsight.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/insights?userId=user123&analysisId=analysis123');
      
      await GET(request);

      expect(mockedPrisma.analysisInsight.findMany).toHaveBeenCalledWith({
        where: {
          analysis: { userId: 'user123' },
          analysisId: 'analysis123',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should filter insights by category', async () => {
      (mockedPrisma.analysisInsight.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.analysisInsight.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/insights?userId=user123&category=sentiment');
      
      await GET(request);

      expect(mockedPrisma.analysisInsight.findMany).toHaveBeenCalledWith({
        where: {
          analysis: { userId: 'user123' },
          category: 'sentiment',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: expect.any(Object)
      });
    });

    it('should respect limit parameter', async () => {
      (mockedPrisma.analysisInsight.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.analysisInsight.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/insights?userId=user123&limit=25');
      
      await GET(request);

      expect(mockedPrisma.analysisInsight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (mockedPrisma.analysisInsight.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/insights?userId=user123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch insights');
      expect(data.details).toBe('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('[Insights API] Request failed:', expect.any(Error));
    });
  });

  describe('POST /api/insights', () => {
    it('should return 400 if analysisId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({ insights: [] }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis ID and insights array are required');
    });

    it('should return 400 if insights is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({ analysisId: 'analysis123' }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis ID and insights array are required');
    });

    it('should return 400 if insights is not an array', async () => {
      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({ 
          analysisId: 'analysis123',
          insights: 'not an array'
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis ID and insights array are required');
    });

    it('should return 404 if analysis not found', async () => {
      (mockedPrisma.analysis.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'analysis123',
          insights: [
            {
              category: 'sentiment',
              key: 'overall_sentiment',
              value: 'positive',
              confidence: 0.85,
            },
          ],
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Analysis not found');
      expect(mockedPrisma.analysis.findUnique).toHaveBeenCalledWith({
        where: { id: 'analysis123' }
      });
    });

    it('should create insights successfully', async () => {
      const mockAnalysis = { id: 'analysis123', userId: 'user123' };
      const mockInsights = [
        {
          category: 'sentiment',
          key: 'overall_sentiment',
          value: 'positive',
          confidence: 0.85,
        },
        {
          category: 'topics',
          key: 'main_topic',
          value: 'product_feedback',
        },
      ];

      (mockedPrisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis as any);
      (mockedPrisma.analysisInsight.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'analysis123',
          insights: mockInsights,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Created 2 insights');
      expect(data.count).toBe(2);

      expect(mockedPrisma.analysisInsight.createMany).toHaveBeenCalledWith({
        data: [
          {
            analysisId: 'analysis123',
            category: 'sentiment',
            key: 'overall_sentiment',
            value: 'positive',
            confidence: 0.85,
          },
          {
            analysisId: 'analysis123',
            category: 'topics',
            key: 'main_topic',
            value: 'product_feedback',
            confidence: null,
          },
        ]
      });
    });

    it('should handle insights without confidence scores', async () => {
      const mockAnalysis = { id: 'analysis123' };
      const mockInsights = [
        {
          category: 'sentiment',
          key: 'overall_sentiment',
          value: 'positive',
          // no confidence
        },
      ];

      (mockedPrisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis as any);
      (mockedPrisma.analysisInsight.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'analysis123',
          insights: mockInsights,
        }),
      });
      
      await POST(request);

      expect(mockedPrisma.analysisInsight.createMany).toHaveBeenCalledWith({
        data: [
          {
            analysisId: 'analysis123',
            category: 'sentiment',
            key: 'overall_sentiment',
            value: 'positive',
            confidence: null,
          },
        ]
      });
    });

    it('should handle errors in POST gracefully', async () => {
      (mockedPrisma.analysis.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'analysis123',
          insights: [],
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create insights');
      expect(data.details).toBe('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('[Insights API] POST request failed:', expect.any(Error));
    });

    it('should log successful insight creation', async () => {
      const mockAnalysis = { id: 'analysis123' };
      
      (mockedPrisma.analysis.findUnique as jest.Mock).mockResolvedValue(mockAnalysis as any);
      (mockedPrisma.analysisInsight.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = new NextRequest('http://localhost:3000/api/insights', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'analysis123',
          insights: [{ category: 'test', key: 'test', value: 'test' }],
        }),
      });
      
      await POST(request);

      expect(mockLogger.info).toHaveBeenCalledWith('[Insights API] Creating insights for analysis:', 'analysis123');
    });
  });
});
