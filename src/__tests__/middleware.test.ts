import { middleware } from '../middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ status: 200, headers: new Headers() })),
    redirect: jest.fn((url) => ({
      status: 307,
      headers: new Headers({ Location: url.toString() }),
    })),
  },
}));
describe('Middleware', () => {
  const createMockRequest = (pathname: string, token?: string): NextRequest => {
    const req = {
      nextUrl: {
        pathname,
        origin: 'http://localhost:3000',
        searchParams: new URLSearchParams(),
      },
      cookies: {
        get: (name: string) => {
          if (name === 'auth-token' && token) {
            return { name: 'auth-token', value: token };
          }
          return undefined;
        },
      },
      url: `http://localhost:3000${pathname}`,
    } as unknown as NextRequest;
    return req;
  };

  it('should allow unauthenticated access to public routes', () => {
    const req = createMockRequest('/');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should redirect unauthenticated user from protected route to login', () => {
    const req = createMockRequest('/upload');
    const res = middleware(req);
    expect(res.status).toBe(307); // Redirect status
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fupload');
  });

  it('should allow authenticated user to access protected route', () => {
    const req = createMockRequest('/analytics', 'some-token');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should redirect authenticated user from auth route to home', () => {
    const req = createMockRequest('/login', 'some-token');
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('should allow unauthenticated user to access auth route', () => {
    const req = createMockRequest('/login');
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('should handle invalid token gracefully', () => {
    const req = createMockRequest('/upload', 'invalid-token');
    // Mocking a thrown error on cookie access
    req.cookies.get = () => { throw new Error('Invalid cookie') };
    const res = middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});
