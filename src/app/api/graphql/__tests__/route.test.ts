import { NextRequest } from 'next/server';

// Mock @as-integrations/next
jest.mock('@as-integrations/next', () => ({
  startServerAndCreateNextHandler: jest.fn(() => 
    jest.fn().mockResolvedValue(new Response('mocked'))
  ),
}));

// Mock @apollo/server
jest.mock('@apollo/server', () => ({
  ApolloServer: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

// Mock graphql-tag
jest.mock('graphql-tag', () => ({
  gql: jest.fn((strings, ...values) => ({ kind: 'Document', definitions: [] })),
}));

// Mock dataloaders
jest.mock('@/lib/dataloaders', () => ({
  createUserLoader: jest.fn(() => ({
    load: jest.fn(),
    loadMany: jest.fn(),
  })),
}));

// Import the functions after mocking
import { GET, POST } from '../route';

describe('GraphQL API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET should work', async () => {
    const mockRequest = {} as NextRequest;
    const result = await GET(mockRequest);
    expect(result).toBeInstanceOf(Response);
  });

  it('POST should work', async () => {
    const mockRequest = {} as NextRequest;
    const result = await POST(mockRequest);
    expect(result).toBeInstanceOf(Response);
  });

  it('should handle GET request properly', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/graphql',
      method: 'GET',
    } as unknown as NextRequest;
    
    const result = await GET(mockRequest);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Response);
  });

  it('should handle POST request properly', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/graphql',
      method: 'POST',
      body: JSON.stringify({ query: '{ hello }' }),
    } as unknown as NextRequest;
    
    const result = await POST(mockRequest);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Response);
  });
});