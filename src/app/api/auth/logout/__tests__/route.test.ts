
import { POST } from '../route';
import { NextResponse } from 'next/server';

// Mock NextResponse to control cookie behavior
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => {
      const response = {
        status: init?.status || 200,
        json: jest.fn().mockResolvedValue(body),
        cookies: {
          set: jest.fn(),
          get: jest.fn(),
        },
        headers: new Headers(),
      };
      return response;
    }),
  },
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear the auth-token cookie and return a success message', async () => {
    const mockCookieSet = jest.fn();
    const mockResponse = {
      status: 200,
      json: jest.fn().mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      }),
      cookies: {
        set: mockCookieSet,
        get: jest.fn(),
      },
      headers: new Headers(),
    };

    (NextResponse.json as jest.Mock).mockReturnValueOnce(mockResponse);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Logged out successfully');

    // Verify that the cookie was set to clear it
    expect(mockCookieSet).toHaveBeenCalledWith('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
  });

  it('should handle errors during logout', async () => {
    const error = new Error('Test error');
    jest.spyOn(NextResponse, 'json').mockImplementationOnce(() => {
      throw error;
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('An error occurred while logging out');

    jest.restoreAllMocks();
  });
});

