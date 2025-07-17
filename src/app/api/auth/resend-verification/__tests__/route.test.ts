
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSecureToken, isValidEmail } from '@/lib/auth';
import { sendEmailVerification } from '@/lib/email';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth');
jest.mock('@/lib/email');

describe('POST /api/auth/resend-verification', () => {
  const mockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email is missing', async () => {
    const req = mockRequest({});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Email is required');
  });

  it('should return 400 if email is invalid', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    const req = mockRequest({ email: 'invalid-email' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Please enter a valid email address');
  });

  it('should return a generic success message if user is not found', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ email: 'nonexistent@example.com' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('If an account with this email exists and is not verified, a verification email has been sent.');
  });

  it('should return a success message if user is already verified', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    const user = { id: '1', email: 'verified@example.com', isEmailVerified: true };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    const req = mockRequest({ email: 'verified@example.com' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Your email is already verified. You can log in now.');
  });

  it('should resend verification email successfully', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    const user = { id: '1', email: 'unverified@example.com', isEmailVerified: false };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (generateSecureToken as jest.Mock).mockReturnValue('new-token');
    (sendEmailVerification as jest.Mock).mockResolvedValue(true);

    const req = mockRequest({ email: 'unverified@example.com' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Verification email sent! Please check your inbox and spam folder.');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        emailVerificationToken: 'new-token',
        emailVerificationExpires: expect.any(Date),
      },
    });
    expect(sendEmailVerification).toHaveBeenCalledWith(user.email, 'new-token', req);
  });

  it('should return 500 if sending email fails', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    const user = { id: '1', email: 'unverified@example.com', isEmailVerified: false };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (generateSecureToken as jest.Mock).mockReturnValue('new-token');
    (sendEmailVerification as jest.Mock).mockResolvedValue(false);

    const req = mockRequest({ email: 'unverified@example.com' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Failed to send verification email. Please try again later.');
  });

  it('should handle database errors gracefully', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = mockRequest({ email: 'test@example.com' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An error occurred while sending the verification email. Please try again.');
  });
});
