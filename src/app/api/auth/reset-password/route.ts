import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, isValidPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: 'Token and password are required' },
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

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      } as any,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      } as any,
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while resetting your password. Please try again.' },
      { status: 500 }
    );
  }
}
