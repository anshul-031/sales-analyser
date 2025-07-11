import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/upload', '/analytics', '/call-analysis'];

// Routes that should redirect to home if user is already authenticated
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let token;
  try {
    token = request.cookies.get('auth-token')?.value;
  } catch (error) {
    console.log('Invalid token in middleware:', error);
  }

  let isAuthenticated = false;
  
  if (token) {
    try {
      // Simple token presence check in middleware
      // Full verification happens in API routes
      isAuthenticated = token.length > 0;
    } catch (error) {
      // Token is invalid, will be treated as not authenticated
      console.log('Invalid token in middleware:', error);
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
