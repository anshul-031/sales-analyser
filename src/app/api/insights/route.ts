import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Logger } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const analysisId = searchParams.get('analysisId');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    Logger.info('[Insights API] Fetching insights for user:', userId);

    const whereClause: any = {
      analysis: { userId },
      ...(analysisId && { analysisId }),
      ...(category && { category }),
    };

    // Get insights with analysis and upload information
    const insights = await prisma.analysisInsight.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        analysis: {
          include: {
            upload: {
              select: {
                id: true,
                filename: true,
                uploadedAt: true,
              }
            },
            callMetrics: true,
          }
        }
      }
    });

    // Get insights summary by category
    const insightsSummary = await prisma.analysisInsight.groupBy({
      by: ['category'],
      where: {
        analysis: { userId }
      },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      insights,
      summary: insightsSummary,
      total: insights.length,
    });

  } catch (error) {
    Logger.error('[Insights API] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { analysisId, insights } = await request.json();

    if (!analysisId || !insights || !Array.isArray(insights)) {
      return NextResponse.json({
        success: false,
        error: 'Analysis ID and insights array are required'
      }, { status: 400 });
    }

    Logger.info('[Insights API] Creating insights for analysis:', analysisId);

    // Validate that the analysis exists
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: 'Analysis not found'
      }, { status: 404 });
    }

    // Create insights
    const createdInsights = await prisma.analysisInsight.createMany({
      data: insights.map(insight => ({
        analysisId,
        category: insight.category,
        key: insight.key,
        value: insight.value,
        confidence: insight.confidence || null,
      }))
    });

    return NextResponse.json({
      success: true,
      message: `Created ${createdInsights.count} insights`,
      count: createdInsights.count,
    });

  } catch (error) {
    Logger.error('[Insights API] POST request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
