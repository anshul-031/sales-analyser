import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAuthenticatedUser } from '@/lib/auth';

// Initialize R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * @swagger
 * /api/upload/all:
 *   delete:
 *     tags: [File Management]
 *     summary: Delete all uploads for the authenticated user
 *     description: Deletes all uploaded files and their associated analyses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All uploads deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "All uploads deleted successfully"
 *                 deletedCount:
 *                   type: number
 *                   example: 5
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    Logger.info('[Upload API] Deleting all uploads for user:', user.id);

    // Get all uploads for the user
    const uploads = await DatabaseStorage.getUploadsByUser(user.id);
    
    if (uploads.length === 0) {
      Logger.info('[Upload API] No uploads found for user:', user.id);
      return NextResponse.json({
        success: true,
        message: 'No uploads to delete',
        deletedCount: 0
      });
    }

    Logger.info(`[Upload API] Found ${uploads.length} uploads to delete for user:`, user.id);

    // Delete files from R2 storage
    const deletePromises = uploads.map(async (upload) => {
      try {
        if (upload.fileUrl) {
          await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: upload.fileUrl,
          }));
          Logger.info('[Upload API] Deleted file from R2:', upload.fileUrl);
        }
      } catch (error) {
        Logger.warn(`[Upload API] Failed to delete file from R2 (file may not exist): ${upload.fileUrl}`, error);
        // Continue with other deletions even if one fails
      }
    });

    // Wait for all R2 deletions to complete (or fail)
    await Promise.allSettled(deletePromises);

    // Delete all upload records from database (cascade delete will handle related analyses)
    const deletedCount = await DatabaseStorage.deleteAllUploadsForUser(user.id);

    Logger.info(`[Upload API] Successfully deleted ${deletedCount} uploads for user:`, user.id);

    return NextResponse.json({
      success: true,
      message: 'All uploads deleted successfully',
      deletedCount: deletedCount
    });

  } catch (error) {
    Logger.error('[Upload API] DELETE ALL request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete all uploads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
