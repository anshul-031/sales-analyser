import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Configure R2 client
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * @swagger
 * /api/upload:
 *   delete:
 *     summary: Delete a specific upload and its associated file
 *     description: Deletes a specific uploaded file from both R2 storage and the database, along with associated analyses
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the upload to delete
 *     responses:
 *       200:
 *         description: Upload successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 uploadId:
 *                   type: string
 *       400:
 *         description: Missing or invalid upload ID
 *       404:
 *         description: Upload not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('id');

    if (!uploadId) {
      Logger.warn('[Upload API] Delete request missing upload ID');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Upload ID is required' 
        },
        { status: 400 }
      );
    }

    Logger.info('[Upload API] Starting delete process for upload:', uploadId);

    // Get the upload record first to get file details
    const upload = await DatabaseStorage.getUploadById(uploadId);
    
    if (!upload) {
      Logger.warn('[Upload API] Upload not found for deletion:', uploadId);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Upload not found' 
        },
        { status: 404 }
      );
    }

    Logger.info('[Upload API] Found upload for deletion:', {
      uploadId,
      filename: upload.filename,
      fileUrl: upload.fileUrl,
      userId: upload.userId
    });

    // Delete the file from R2 storage
    try {
      if (upload.fileUrl) {
        await r2.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: upload.fileUrl,
        }));
        Logger.info('[Upload API] Successfully deleted file from R2:', upload.fileUrl);
      }
    } catch (r2Error) {
      // Log error but continue with database deletion - file might already be gone
      Logger.warn('[Upload API] Failed to delete file from R2 (file may not exist):', r2Error);
    }

    // Delete the upload record from database (cascade delete will handle related analyses)
    try {
      await DatabaseStorage.deleteUpload(uploadId);
      Logger.info('[Upload API] Successfully deleted upload from database:', uploadId);
    } catch (dbError) {
      Logger.error('[Upload API] Failed to delete upload from database:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      message: 'Upload successfully deleted',
      uploadId
    });

  } catch (error) {
    Logger.error('[Upload API] Error deleting upload:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
