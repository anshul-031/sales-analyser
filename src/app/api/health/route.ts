import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check endpoint
 *     description: Returns system health status and environment information
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: object
 */
export async function GET(request: NextRequest) {
  console.log('[HEALTH] Health check endpoint called');
  
  return NextResponse.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      uptime: process.uptime()
    }
  });
}
