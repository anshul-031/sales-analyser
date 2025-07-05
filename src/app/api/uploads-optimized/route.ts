import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/serialization';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const uploads = await DatabaseStorage.getUploadsByUser(user.id);

    return NextResponse.json({
      success: true,
      uploads: serializeBigInt(uploads),
    });

  } catch (error) {
    Logger.error('[Uploads API Optimized] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch uploads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}