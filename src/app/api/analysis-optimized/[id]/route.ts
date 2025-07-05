import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/serialization';

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const analysisId = context.params.id;

    const analysis = await DatabaseStorage.getAnalysisById(analysisId);

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Analysis not found or access denied'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      analysis: serializeBigInt(analysis),
    });

  } catch (error) {
    Logger.error('[Analysis API Optimized] Request failed:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Analysis not found or access denied'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}