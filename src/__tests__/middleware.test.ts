
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({
      status: 200,
      headers: new Headers(),
    })),
    redirect: jest.fn((url: URL) => {
      const headers = new Headers();
      headers.set('Location', url.toString());
      return {
        status: 307,
        headers,
      };
    }),
  },
}));

// Mock NextRequest
const createMockRequest = (pathname: string, token?: string): NextRequest => {
  const url = `http://localhost${pathname}`;
  const request: any = {
    nextUrl: { pathname },
    cookies: {
      get: jest.fn((name: string) => {
        if (name === 'auth-token' && token) {
          return { name: 'auth-token', value: token };
        }
        return undefined;
      }),
    },
    url,
  };
  return request as NextRequest;
};

describe('Middleware', () => {
  it('should allow unauthenticated access to public routes', () => {
    const req = createMockRequest('/');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should redirect unauthenticated users from protected routes to /login', () => {
    const req = createMockRequest('/upload');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?redirect=%2Fupload');
  });

  it('should allow authenticated users to access protected routes', () => {
    const req = createMockRequest('/upload', 'some-token');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should redirect authenticated users from auth routes to /', () => {
    const req = createMockRequest('/login', 'some-token');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
  });

  it('should allow unauthenticated users to access auth routes', () => {
    const req = createMockRequest('/login');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should handle invalid tokens gracefully and redirect to login', () => {
    const req = createMockRequest('/upload', 'invalid-token');
    (req.cookies.get as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?redirect=%2Fupload');
  });
});
