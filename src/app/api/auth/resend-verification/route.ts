import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSecureToken, isValidEmail } from '@/lib/auth';
import { sendEmailVerification } from '@/lib/email';

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Authentication]
 *     summary: Resend email verification
 *     description: Resend verification email to users who haven't verified their email yet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid email or validation error
 *       500:
 *         description: Internal server error
 */
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

    if (!user) {
      // Don't reveal if the user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account with this email exists and is not verified, a verification email has been sent.',
      });
    }

    // Check if user is already verified
    if (user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can log in now.',
      });
    }

    // Generate new verification token
    const emailVerificationToken = generateSecureToken();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires,
      } as any,
    });

    // Send verification email
    const emailSent = await sendEmailVerification(user.email, emailVerificationToken, request);
    if (!emailSent) {
      console.error('Failed to send verification email to:', user.email);
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent! Please check your inbox and spam folder.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while sending the verification email. Please try again.' },
      { status: 500 }
    );
  }
}
