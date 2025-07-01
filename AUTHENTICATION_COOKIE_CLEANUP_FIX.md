# Authentication Cookie Cleanup Fix

## Issue
Users were unable to access sign-in or sign-up pages when authentication failed. The problem occurred because:

1. Invalid/expired authentication tokens remained in browser cookies
2. The middleware detected the presence of a cookie and treated it as valid authentication
3. Middleware redirected authenticated users away from auth pages (`/login`, `/register`)
4. But the actual authentication verification in API routes failed (401 responses)
5. This created a loop where users couldn't access login/register pages to re-authenticate

## Root Cause
The authentication context (`AuthProvider`) was correctly clearing the user state when authentication failed, but was not clearing the invalid authentication cookie from the browser. This caused a mismatch between:
- **Middleware logic**: Simple cookie presence check (treats any cookie as valid)
- **API verification**: Actual JWT token validation (properly rejects invalid tokens)

## Solution
Modified the `checkAuth` function in `/src/lib/auth-context.tsx` to automatically clear invalid authentication cookies when authentication fails.

### Changes Made
1. **Added `clearInvalidCookie` function**: Calls the `/api/auth/logout` endpoint to properly clear the `auth-token` cookie
2. **Enhanced `checkAuth` function**: Now calls `clearInvalidCookie` in all failure scenarios:
   - When API returns 401 (authentication failed)
   - When API returns non-success response
   - When network errors occur during authentication check

### Code Changes
```tsx
const clearInvalidCookie = async () => {
  try {
    console.log('[Auth] Clearing invalid authentication cookie...');
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    console.log('[Auth] Invalid cookie cleared.');
  } catch (error) {
    console.error('[Auth] Error clearing invalid cookie:', error);
  }
};
```

The `checkAuth` function now calls `clearInvalidCookie()` in all error scenarios to ensure stale cookies are removed.

## Result
- ✅ Users can now access login and register pages when authentication fails
- ✅ Invalid/expired cookies are automatically cleared
- ✅ No more redirect loops between auth pages and protected routes
- ✅ Clean authentication state management

## Test Scenario
1. Start with an invalid/expired authentication cookie
2. Navigate to the application
3. Authentication check fails (401 response)
4. Invalid cookie is automatically cleared
5. User can now access `/login` and `/register` pages
6. User can successfully authenticate again

## Log Evidence
```
GET /api/auth/me 401 in 1482ms          // Auth check fails
POST /api/auth/logout 200 in 423ms      // Invalid cookie cleared
GET /login 200 in 735ms                 // Login page accessible
```

## Files Modified
- `/src/lib/auth-context.tsx` - Added automatic cookie cleanup on authentication failure
