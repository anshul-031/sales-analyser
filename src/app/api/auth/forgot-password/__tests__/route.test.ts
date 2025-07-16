import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  generateSecureToken: jest.fn(),
  isValidEmail: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const mockPrisma = require('@/lib/db').prisma;
const mockGenerateSecureToken = require('@/lib/auth').generateSecureToken;
const mockIsValidEmail = require('@/lib/auth').isValidEmail;
const mockSendPasswordResetEmail = require('@/lib/email').sendPasswordResetEmail;

describe('Forgot Password API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Email is required');
  });

  it('returns 400 when email is invalid', async () => {
    mockIsValidEmail.mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid-email' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Please enter a valid email address');
  });

  it('returns success message when user does not exist (to prevent email enumeration)', async () => {
    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('If an account with that email exists, we have sent a password reset link.');
  });

  it('generates reset token and sends email when user exists', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };
    const mockToken = 'secure-reset-token';

    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockGenerateSecureToken.mockReturnValue(mockToken);
    mockPrisma.user.update.mockResolvedValue(mockUser);
    mockSendPasswordResetEmail.mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('If an account with that email exists, we have sent a password reset link.');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });

    expect(mockGenerateSecureToken).toHaveBeenCalled();
    
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        passwordResetToken: mockToken,
        passwordResetExpires: expect.any(Date),
      },
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      'test@example.com',
      mockToken,
      expect.any(NextRequest)
    );
  });

  it('handles email sending failure gracefully', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };
    const mockToken = 'secure-reset-token';

    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockGenerateSecureToken.mockReturnValue(mockToken);
    mockPrisma.user.update.mockResolvedValue(mockUser);
    mockSendPasswordResetEmail.mockResolvedValue(false); // Email fails to send

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('If an account with that email exists, we have sent a password reset link.');

    // Should still return success even if email fails
    expect(console.error).toHaveBeenCalledWith(
      'Failed to send password reset email to:',
      'test@example.com'
    );
  });

  it('handles database errors', async () => {
    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('An error occurred while processing your request. Please try again.');
  });

  it('normalizes email to lowercase', async () => {
    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'Test@EXAMPLE.COM' }),
    });

    await POST(request);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('sets correct expiration time for reset token', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    };
    const mockToken = 'secure-reset-token';
    const mockDate = new Date('2023-01-01T12:00:00Z');

    // Mock Date to control time
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    Date.now = jest.fn(() => mockDate.getTime());

    mockIsValidEmail.mockReturnValue(true);
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockGenerateSecureToken.mockReturnValue(mockToken);
    mockPrisma.user.update.mockResolvedValue(mockUser);
    mockSendPasswordResetEmail.mockResolvedValue(true);

    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    await POST(request);

    const expectedExpiration = new Date(mockDate.getTime() + 60 * 60 * 1000); // 1 hour from now

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user123' },
      data: {
        passwordResetToken: mockToken,
        passwordResetExpires: expectedExpiration,
      },
    });

    // Restore original Date
    jest.restoreAllMocks();
  });

  it('handles JSON parsing errors', async () => {
    const request = new NextRequest('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('An error occurred while processing your request. Please try again.');
  });
});
