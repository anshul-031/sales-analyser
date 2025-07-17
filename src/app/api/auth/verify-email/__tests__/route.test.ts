
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('GET /api/auth/verify-email', () => {
  const mockRequest = (token: string | null) => {
    const url = token ? `http://localhost/api/auth/verify-email?token=${token}` : 'http://localhost/api/auth/verify-email';
    return new NextRequest(url);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if token is missing', async () => {
    const req = mockRequest(null);
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Verification token is required');
  });

  it('should return 400 if token is invalid or expired', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const req = mockRequest('invalid-token');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Invalid or expired verification token');
  });

  it('should verify email and redirect to login', async () => {
    const user = { id: '1', emailVerificationToken: 'valid-token', emailVerificationExpires: new Date(Date.now() + 3600000) };
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);

    const req = mockRequest('valid-token');
    const res = await GET(req);

    expect(res.status).toBe(302); // Redirect status (NextResponse.redirect uses 302 by default)
    expect(res.headers.get('Location')).toBe('http://localhost/login?verified=true');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = mockRequest('some-token');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An error occurred while verifying your email');
    
    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Email verification error:', expect.any(Error));
    
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
