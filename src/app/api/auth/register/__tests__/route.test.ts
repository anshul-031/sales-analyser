import { POST } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as auth from '@/lib/auth';
import * as email from '@/lib/email';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn(),
  generateSecureToken: jest.fn(),
  isValidEmail: jest.fn(),
  isValidPassword: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendEmailVerification: jest.fn(),
}));

describe('POST /api/auth/register', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user and return a success message', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (auth.isValidEmail as jest.Mock).mockReturnValue(true);
    (auth.isValidPassword as jest.Mock).mockReturnValue({ isValid: true });
    (auth.hashPassword as jest.Mock).mockResolvedValue('hashedpassword');
    (auth.generateSecureToken as jest.Mock).mockReturnValue('verificationtoken');
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: false,
    });
    (email.sendEmailVerification as jest.Mock).mockResolvedValue(true);

    const req = {
      json: async () => ({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
      headers: new Headers({
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.message).toBe('Account created successfully! Please check your email to verify your account.');
    expect(json.user).toBeDefined();
  });

  it('should return 409 if user already exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
    (auth.isValidEmail as jest.Mock).mockReturnValue(true);
    (auth.isValidPassword as jest.Mock).mockReturnValue({ isValid: true });

    const req = {
      json: async () => ({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
      headers: new Headers({
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An account with this email already exists');
  });

  it('should return 400 for invalid email', async () => {
    (auth.isValidEmail as jest.Mock).mockReturnValue(false);

    const req = {
      json: async () => ({
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
      headers: new Headers({
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Please enter a valid email address');
  });

  it('should return 400 for invalid password', async () => {
    (auth.isValidEmail as jest.Mock).mockReturnValue(true);
    (auth.isValidPassword as jest.Mock).mockReturnValue({
      isValid: false,
      message: 'Password is not strong enough.',
    });

    const req = {
      json: async () => ({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      }),
      headers: new Headers({
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe('Password is not strong enough.');
  });

  it('should return 500 if there is a database error', async () => {
    (auth.isValidEmail as jest.Mock).mockReturnValue(true);
    (auth.isValidPassword as jest.Mock).mockReturnValue({ isValid: true });
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

    const req = {
      json: async () => ({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
      headers: new Headers({
        'host': 'localhost:3000',
        'x-forwarded-proto': 'http',
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe('An error occurred while creating your account. Please try again.');
  });
});