import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

const mockFs = require('fs');

describe('API Endpoints Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console spy
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns fallback endpoints when file scanning fails', async () => {
    // Mock fs.existsSync to return false for all paths
    mockFs.existsSync.mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.endpoints).toBeDefined();
    expect(Array.isArray(data.endpoints)).toBe(true);
    expect(data.endpoints.length).toBeGreaterThan(0);
    expect(data.lastUpdated).toBeDefined();
    expect(data.debug).toBeDefined();
  });

  it('includes debug information in response', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(data.debug.totalEndpoints).toBeDefined();
    expect(data.debug.environment).toBeDefined();
    expect(data.debug.isVercel).toBeDefined();
  });

  it('handles file system errors gracefully', async () => {
    // Mock fs.existsSync to throw an error
    mockFs.existsSync.mockImplementation(() => {
      throw new Error('File system error');
    });

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.endpoints).toBeDefined();
  });

  it('returns endpoints with correct structure', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    // Check that endpoints have the expected structure
    expect(data.endpoints).toBeDefined();
    if (data.endpoints.length > 0) {
      const endpoint = data.endpoints[0];
      expect(endpoint).toHaveProperty('method');
      expect(endpoint).toHaveProperty('path');
      expect(endpoint).toHaveProperty('description');
      expect(endpoint).toHaveProperty('category');
    }
  });

  it('finds route files when API directory exists', async () => {
    // Mock successful file system operations
    mockFs.existsSync
      .mockReturnValueOnce(false) // First few paths don't exist
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true); // One path exists

    mockFs.readdirSync.mockReturnValue([
      { name: 'route.ts', isDirectory: () => false },
      { name: 'subdir', isDirectory: () => true },
    ]);

    mockFs.readFileSync.mockReturnValue(`
      export async function GET() {
        return new Response('test');
      }
    `);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('handles errors during endpoint extraction', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mock fs operations to trigger various error conditions
    mockFs.existsSync.mockImplementation(() => {
      throw new Error('Extraction error');
    });

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.endpoints).toBeDefined();

    consoleSpy.mockRestore();
  });

  it('processes route files with different extensions', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([
      { name: 'route.ts', isDirectory: () => false },
      { name: 'route.js', isDirectory: () => false },
      { name: 'other.ts', isDirectory: () => false },
    ]);

    mockFs.readFileSync.mockReturnValue(`
      export async function POST() {
        return new Response('test');
      }
    `);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('skips non-route files', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([
      { name: 'not-a-route.ts', isDirectory: () => false },
      { name: 'middleware.ts', isDirectory: () => false },
      { name: 'types.ts', isDirectory: () => false },
    ]);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('handles recursive directory scanning', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync
      .mockReturnValueOnce([
        { name: 'subdir', isDirectory: () => true },
      ])
      .mockReturnValueOnce([
        { name: 'route.ts', isDirectory: () => false },
      ]);

    mockFs.readFileSync.mockReturnValue(`
      export async function GET() {
        return new Response('test');
      }
    `);

    const request = new NextRequest('http://localhost:3000/api/endpoints');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
