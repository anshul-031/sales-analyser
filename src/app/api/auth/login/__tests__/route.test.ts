import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/db';
import { comparePassword, generateToken, isValidEmail, createAuthResponse } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';


// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth utils
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
  isValidEmail: jest.fn(),
  createAuthResponse: jest.fn(),
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or password are not provided', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Email and password are required');
  });

  it('should return 400 if email is invalid', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(false);
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: 'password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Please enter a valid email address');
  });

  it('should return 401 if user is not found', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid email or password');
  });

  it('should return 401 if password is invalid', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', password: 'hashed-password' });
    (comparePassword as jest.Mock).mockResolvedValue(false);
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid email or password');
  });

  it('should return 403 if email is not verified', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', password: 'hashed-password', isEmailVerified: false });
    (comparePassword as jest.Mock).mockResolvedValue(true);
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe('Please verify your email address before logging in. Check your inbox for a verification link.');
  });

  it('should return 200 and a token on successful login', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    const user = { id: '1', email: 'test@example.com', password: 'hashed-password', isEmailVerified: true, firstName: 'Test', lastName: 'User' };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
    (comparePassword as jest.Mock).mockResolvedValue(true);
    (generateToken as jest.Mock).mockReturnValue('test-token');
    (createAuthResponse as jest.Mock).mockReturnValue({ success: true, user, token: 'test-token' });

    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.token).toBe('test-token');
    expect((response as any).cookies.set).toHaveBeenCalledWith('auth-token', 'test-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
  });

  it('should return 500 on server error', async () => {
    (isValidEmail as jest.Mock).mockReturnValue(true);
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe('An error occurred while logging in. Please try again.');
  });
});