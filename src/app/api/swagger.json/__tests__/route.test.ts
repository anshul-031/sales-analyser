import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock the regenerateSwaggerSpec function
jest.mock('@/lib/swagger', () => ({
  regenerateSwaggerSpec: jest.fn(),
}));

// Mock swagger-jsdoc
jest.mock('swagger-jsdoc', () => {
  return jest.fn(() => ({
    openapi: '3.0.0',
    info: {
      title: 'AI Call Analyser API',
      version: '1.0.0',
    },
    paths: {
      '/api/health': {
        get: {
          summary: 'Health check',
        },
      },
    },
  }));
});

const { regenerateSwaggerSpec } = require('@/lib/swagger');
const mockRegenerateSwaggerSpec = regenerateSwaggerSpec as jest.MockedFunction<typeof regenerateSwaggerSpec>;

describe('/api/swagger.json', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return swagger specification in JSON format', async () => {
    // Mock successful swagger generation
    mockRegenerateSwaggerSpec.mockResolvedValueOnce({
      openapi: '3.0.0',
      info: {
        title: 'AI Call Analyser API',
        version: '1.0.0',
      },
      paths: {
        '/api/health': {
          get: {
            summary: 'Health check',
          },
        },
      },
    });

    const request = new NextRequest('http://localhost:3000/api/swagger.json', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    
    const contentType = response.headers.get('content-type');
    expect(contentType).toBe('application/json');

    const data = await response.json();
    expect(data).toEqual(expect.objectContaining({
      openapi: '3.0.0',
      info: expect.objectContaining({
        title: 'AI Call Analyser API',
        version: '1.0.0',
      }),
      paths: expect.objectContaining({
        '/api/health': expect.objectContaining({
          get: expect.objectContaining({
            summary: 'Health check',
          }),
        }),
      }),
    }));
  });

  it('should handle swagger generation errors', async () => {
    // Mock swagger generation error
    mockRegenerateSwaggerSpec.mockRejectedValueOnce(new Error('Swagger generation failed'));

    const request = new NextRequest('http://localhost:3000/api/swagger.json', {
      method: 'GET',
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual(expect.objectContaining({
      error: 'Failed to generate OpenAPI specification',
      details: 'Swagger generation failed',
    }));
  });

  it('should include proper cache headers', async () => {
    // Mock successful swagger generation
    mockRegenerateSwaggerSpec.mockResolvedValueOnce({
      openapi: '3.0.0',
      info: {
        title: 'AI Call Analyser API',
        version: '1.0.0',
      },
      paths: {},
    });

    const request = new NextRequest('http://localhost:3000/api/swagger.json', {
      method: 'GET',
    });

    const response = await GET(request);
    
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toBe('no-cache, no-store, must-revalidate');
    
    const pragma = response.headers.get('Pragma');
    expect(pragma).toBe('no-cache');
    
    const expires = response.headers.get('Expires');
    expect(expires).toBe('0');
  });
});
