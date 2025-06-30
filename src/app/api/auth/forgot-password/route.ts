import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSecureToken, isValidEmail } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    }) as any;

    // Always return success to prevent email enumeration
    const successMessage = 'If an account with that email exists, we have sent a password reset link.';

    if (!user) {
      return NextResponse.json({
        success: true,
        message: successMessage,
      });
    }

    // Generate reset token
    const passwordResetToken = generateSecureToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpires,
      } as any,
    });

    // Send reset email
    const emailSent = await sendPasswordResetEmail(user.email, passwordResetToken, request);
    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
