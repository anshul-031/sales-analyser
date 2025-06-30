import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      } as any,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      } as any,
    });

    // Redirect to success page
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred while verifying your email' },
      { status: 500 }
    );
  }
}
