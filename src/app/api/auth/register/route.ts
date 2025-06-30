import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateSecureToken, isValidEmail, isValidPassword } from '@/lib/auth';
import { sendEmailVerification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { success: false, message: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    }) as any;

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and generate verification token
    const hashedPassword = await hashPassword(password);
    const emailVerificationToken = generateSecureToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Find user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        emailVerificationToken,
        emailVerificationExpires,
      },
    }) as any;

    // Send verification email
    const emailSent = await sendEmailVerification(user.email, emailVerificationToken, request);
    if (!emailSent) {
      console.error('Failed to send verification email to:', user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while creating your account. Please try again.' },
      { status: 500 }
    );
  }
}
