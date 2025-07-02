import { NextRequest, NextResponse } from 'next/server';
import { regenerateSwaggerSpec } from '@/lib/swagger';

/**
 * @swagger
 * /api/swagger.json:
 *   get:
 *     tags: [Documentation]
 *     summary: Get OpenAPI specification
 *     description: Returns the complete OpenAPI 3.0 specification for the AI Call Analyser API, dynamically generated from current code
 *     parameters:
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *         description: Force regeneration of the specification
 *     responses:
 *       200:
 *         description: OpenAPI specification in JSON format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET(request: NextRequest) {
  try {
    // Check if refresh is requested
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';
    
    // Regenerate the spec (always fresh in development)
    const spec = await regenerateSwaggerSpec();
    
    // Add generation timestamp
    const enhancedSpec = {
      ...spec,
      info: {
        ...(spec as any).info,
        'x-generated-at': new Date().toISOString(),
        'x-auto-generated': true,
        'x-source': 'Live code analysis'
      }
    };
    
    return NextResponse.json(enhancedSpec, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate OpenAPI specification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
