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
  const createMockRequest = (pathname: string, token?: string | null): NextRequest => {
    const req = {
      nextUrl: {
        pathname,
        origin: 'http://localhost:3000',
        searchParams: new URLSearchParams(),
      },
      cookies: {
        get: (name: string) => {
          if (name === 'auth-token') {
            if (token === null) {
              return undefined;
            }
            return { name: 'auth-token', value: token };
          }
          return undefined;
        },
      },
      url: `http://localhost:3000${pathname}`,
    } as unknown as NextRequest;
    return req;
  };

  // Test cases for public routes
  describe('Public Routes', () => {
    it('should allow unauthenticated access to the home page', () => {
      const req = createMockRequest('/', null);
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('should allow authenticated access to the home page', () => {
      const req = createMockRequest('/', 'some-token');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  // Test cases for protected routes
  describe('Protected Routes', () => {
    const protectedRoutes = ['/upload', '/analytics', '/call-analysis', '/upload/nested'];

    protectedRoutes.forEach(route => {
      it(`should redirect unauthenticated user from ${route} to login`, () => {
        const req = createMockRequest(route, null);
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain(`/login?redirect=${encodeURIComponent(route)}`);
      });

      it(`should allow authenticated user to access ${route}`, () => {
        const req = createMockRequest(route, 'some-token');
        const res = middleware(req);
        expect(res.status).toBe(200);
      });
    });

    it('should redirect user with an empty token from a protected route', () => {
      const req = createMockRequest('/upload', '');
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });
  });

  // Test cases for authentication routes
  describe('Authentication Routes', () => {
    const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

    authRoutes.forEach(route => {
      it(`should redirect authenticated user from ${route} to home`, () => {
        const req = createMockRequest(route, 'some-token');
        const res = middleware(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost:3000/');
      });

      it(`should allow unauthenticated user to access ${route}`, () => {
        const req = createMockRequest(route, null);
        const res = middleware(req);
        expect(res.status).toBe(200);
      });
    });
  });

  // Test cases for error handling and edge cases
  describe('Edge Cases and Error Handling', () => {
    it('should handle errors when accessing cookies and redirect to login', () => {
      const req = createMockRequest('/upload', 'any-token');
      req.cookies.get = () => {
        throw new Error('Cookie access error');
      };
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });

    it('should treat a token with only spaces as valid and allow access', () => {
        const req = createMockRequest('/upload', ' ');
        const res = middleware(req);
        expect(res.status).toBe(200);
    });

    it('should handle a token that throws on length access', () => {
        const tokenThatThrows = {
          get length() {
            throw new Error('Cannot access length');
          },
          toString: () => 'a-token',
        };
  
        const req = createMockRequest('/upload', 'any-token');
        req.cookies.get = (name: string) => {
          if (name === 'auth-token') {
            return { name: 'auth-token', value: tokenThatThrows as any };
          }
          return undefined;
        };
  
        const res = middleware(req);
        // It should be treated as unauthenticated
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('/login');
      });
  });
});
