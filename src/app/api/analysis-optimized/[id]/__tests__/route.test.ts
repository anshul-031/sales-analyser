import { GET } from '../route';
import { NextRequest } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/serialization';

jest.mock('@/lib/db');
jest.mock('@/lib/auth');
jest.mock('@/lib/serialization');

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;
const mockGetAnalysisById = DatabaseStorage.getAnalysisById as jest.Mock;
const mockSerializeBigInt = serializeBigInt as jest.Mock;

describe('GET /api/analysis-optimized/[id]', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Authentication required');
  });

  it('should return 404 if analysis is not found', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' });
    mockGetAnalysisById.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Analysis not found or access denied');
  });

  it('should return 404 if analysis does not belong to the user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' });
    mockGetAnalysisById.mockResolvedValue({ id: '123', userId: 'user-2' });
    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Analysis not found or access denied');
  });

  it('should return the analysis if found and user is authorized', async () => {
    const analysisData = { id: '123', userId: 'user-1', data: 'test' };
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' });
    mockGetAnalysisById.mockResolvedValue(analysisData);
    mockSerializeBigInt.mockReturnValue(analysisData);

    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.analysis).toEqual(analysisData);
  });

  it('should handle query params for includes', async () => {
    const analysisData = { id: '123', userId: 'user-1', data: 'test' };
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' });
    mockGetAnalysisById.mockResolvedValue(analysisData);
    mockSerializeBigInt.mockReturnValue(analysisData);

    const req = new NextRequest('http://localhost/api/analysis-optimized/123?includeUser=true&includeUpload=false&includeInsights=true&includeCallMetrics=false');
    const context = { params: Promise.resolve({ id: '123' }) };
    await GET(req, context);

    expect(mockGetAnalysisById).toHaveBeenCalledWith('123', {
      includeUser: true,
      includeUpload: false,
      includeInsights: true,
      includeCallMetrics: false,
    });
  });

  it('should return 500 on generic error', async () => {
    const error = new Error('Something went wrong');
    mockGetAuthenticatedUser.mockRejectedValue(error);
    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch analysis');
  });
});
  it('should return 404 when getAnalysisById throws a "not found" error', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: 'user-1' });
    const error = new Error('Analysis not found for id: 123');
    mockGetAnalysisById.mockRejectedValue(error);

    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Analysis not found or access denied');
  });
  it('should return 500 and "Unknown error" for non-Error exceptions', async () => {
    const error = 'A string error';
    mockGetAuthenticatedUser.mockRejectedValue(error);
    const req = new NextRequest('http://localhost/api/analysis-optimized/123');
    const context = { params: Promise.resolve({ id: '123' }) };
    const response = await GET(req, context);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch analysis');
    expect(body.details).toBe('Unknown error');
  });