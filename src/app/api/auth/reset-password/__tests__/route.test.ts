
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, isValidPassword } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth');

describe('POST /api/auth/reset-password', () => {
  const mockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if token or password is missing', async () => {
    const req = mockRequest({ token: 'test' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Token and password are required');

    const req2 = mockRequest({ password: 'test' });
    const res2 = await POST(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(400);
    expect(json2.success).toBe(false);
    expect(json2.message).toBe('Token and password are required');
  });

  it('should return 400 if password is invalid', async () => {
    (isValidPassword as jest.Mock).mockReturnValue({ isValid: false, message: 'Password is too weak' });
    const req = mockRequest({ token: 'some-token', password: 'weak' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Password is too weak');
  });

  it('should return 400 if reset token is invalid or expired', async () => {
    (isValidPassword as jest.Mock).mockReturnValue({ isValid: true });
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ token: 'invalid-token', password: 'strongpassword' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Invalid or expired reset token');
  });

  it('should reset password successfully', async () => {
    (isValidPassword as jest.Mock).mockReturnValue({ isValid: true });
    const user = { id: '1', passwordResetToken: 'valid-token', passwordResetExpires: new Date(Date.now() + 3600000) };
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);
    (hashPassword as jest.Mock).mockResolvedValue('hashed-password');

    const req = mockRequest({ token: 'valid-token', password: 'strongpassword' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Password reset successful. You can now log in with your new password.');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: {
        password: 'hashed-password',
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    (isValidPassword as jest.Mock).mockReturnValue({ isValid: true });
    (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
    const req = mockRequest({ token: 'some-token', password: 'strongpassword' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An error occurred while resetting your password. Please try again.');
  });
});
