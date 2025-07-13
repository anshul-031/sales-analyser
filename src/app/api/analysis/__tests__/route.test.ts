
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

jest.mock('@/lib/auth');

describe('POST /api/analysis', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.Mock;

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      } as Response)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ fileIds: ['1'], userId: '1', parameters: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 if fileIds is missing', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '1' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ userId: '1', parameters: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('fileIds array is required and must not be empty');
  });

  it('should return 400 if userId is missing', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '1' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ fileIds: ['1'], parameters: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('userId is required');
  });

  it('should return 400 if parameters is missing', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '1' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ fileIds: ['1'], userId: '1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('parameters array is required');
  });

  it('should return 403 if userId does not match authenticated user', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '2' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ fileIds: ['1'], userId: '1', parameters: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User ID mismatch');
  });

  it('should return 400 if no valid file IDs are provided', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '1' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ fileIds: [null, '', undefined], userId: '1', parameters: [] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('No valid file IDs provided');
  });

  it('should trigger analysis successfully', async () => {
    mockGetAuthenticatedUser.mockResolvedValue({ id: '1' });

    const request = new NextRequest('http://localhost/api/analysis', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        Cookie: 'cookie',
      },
      body: JSON.stringify({ fileIds: ['1', '2'], userId: '1', parameters: [{id: '1', name: 'test', description: 'test', prompt: 'test', enabled: true}] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Analysis successfully triggered for 2 file(s).');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
          Cookie: 'cookie',
        },
        body: JSON.stringify({
          uploadIds: ['1', '2'],
          analysisType: 'parameters',
          customParameters: [{id: '1', name: 'test', description: 'test', prompt: 'test', enabled: true}],
        }),
      })
    );
  });
});
