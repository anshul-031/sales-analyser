import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { FILE_UPLOAD_CONFIG } from '@/lib/constants';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [File Management]
 *     summary: Upload audio files
 *     description: Upload one or more audio files for analysis (MP3, WAV, M4A)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Audio files to upload
 *               customParameters:
 *                 type: string
 *                 description: JSON string of custom analysis parameters
 *                 example: '["sentiment", "key_points", "action_items"]'
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Invalid file format or size
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// File validation constants - use centralized config with env override
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || FILE_UPLOAD_CONFIG.MAX_FILE_SIZE.toString());
const ALLOWED_MIME_TYPES = FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES;
const ALLOWED_EXTENSIONS = FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS;

function isValidAudioFile(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  const fileExtension = `.${extension}`;
  
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type) ||
         (ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  Logger.info('[Upload API] Starting in-memory file upload process');
  
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const customParametersStr = formData.get('customParameters') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 });
    }

    Logger.info('[Upload API] Processing', files.length, 'files for user:', user.id);

    const results = [];
    let successCount = 0;
    let failCount = 0;
    let totalUploadDuration = 0;

    for (const file of files) {
      const fileUploadStartTime = Date.now();
      try {
        Logger.info('[Upload API] Processing file:', file.name, 'size:', file.size, 'bytes');

        // Validate file type
        if (!isValidAudioFile(file)) {
          results.push({
            filename: file.name,
            success: false,
            error: 'Invalid file type. Supported: MP3, WAV, M4A, AAC, OGG, FLAC, WebM'
          });
          failCount++;
          continue;
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          results.push({
            filename: file.name,
            success: false,
            error: `File too large. Maximum size: ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
          });
          failCount++;
          continue;
        }

        // Convert file to buffer (store in memory)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        Logger.info('[Upload API] File loaded into memory:', file.name);

        const key = `uploads/${user.id}/${file.name}`;
        const expires = new Date();
        expires.setDate(expires.getDate() + 1); // 24-hour expiry

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
            Expires: expires,
        }));
        
        Logger.info('[Upload API] File uploaded to R2 with key:', key);

        const uploadRecord = await DatabaseStorage.createUpload({
          filename: file.name,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileUrl: key,
          userId: user.id,
        });
        
        const uploadDuration = Date.now() - fileUploadStartTime;
        totalUploadDuration += uploadDuration;

        results.push({
          id: uploadRecord.id,
          filename: file.name,
          size: file.size,
          type: file.type,
          success: true,
          uploadedAt: uploadRecord.uploadedAt,
          uploadDuration,
        });

        successCount++;
        Logger.info('[Upload API] Successfully processed file:', file.name);

      } catch (error) {
        Logger.error('[Upload API] Error processing file', file.name + ':', error);
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failCount++;
      }
    }
    const overallDuration = Date.now() - startTime;
    Logger.info('[Upload API] Upload complete. Success:', successCount, 'Failed:', failCount, 'Total time:', overallDuration, 'ms');

    // Automatically start analysis for successfully uploaded files
    let analysisStarted = false;
    let analyses = [];

    if (successCount > 0) {
      Logger.info('[Upload API] Auto-starting analysis for uploaded files');
      
      try {
        // Get upload IDs from successful uploads
        const uploadIds = results.filter(r => r.success).map(r => r.id);
        
        // Call analyze API to start automatic analysis
        // Dynamically detect base URL from request headers
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') ||
                        (host?.includes('localhost') ? 'http' : 'https');
        const baseUrl = `${protocol}://${host}`;
          
        // Parse custom parameters if provided
        let analysisPayload;
        if (customParametersStr) {
          try {
            const customParameters = JSON.parse(customParametersStr);
            analysisPayload = {
              uploadIds: uploadIds,
              analysisType: 'parameters',
              customParameters: customParameters,
              userId: user.id,
              autoTriggered: true
            };
          } catch (error) {
            Logger.warn('[Upload API] Failed to parse custom parameters, using default analysis');
            analysisPayload = {
              uploadIds: uploadIds,
              analysisType: 'default',
              userId: user.id,
              autoTriggered: true
            };
          }
        } else {
          analysisPayload = {
            uploadIds: uploadIds,
            analysisType: 'default',
            userId: user.id,
            autoTriggered: true
          };
        }

        // Create a new NextRequest for internal API call
        const internalRequest = new NextRequest(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || '',
          },
          body: JSON.stringify(analysisPayload)
        });

        // Make the internal API call
        const { POST: analyzeHandler } = await import('../analyze/route');
        const analyzeResponse = await analyzeHandler(internalRequest);

        if (analyzeResponse.status === 200) {
          const analyzeResult = await analyzeResponse.json();
          analysisStarted = true;
          analyses = analyzeResult.analyses || [];
          Logger.info('[Upload API] Analysis auto-started successfully for', uploadIds.length, 'files');
        } else {
          Logger.warn('[Upload API] Failed to auto-start analysis, status:', analyzeResponse.status);
        }
      } catch (error) {
        Logger.error('[Upload API] Error auto-starting analysis:', error);
      }
    }

    // Import serialization utility
    const { serializeAnalyses } = await import('../../../lib/serialization');

    return NextResponse.json({
      success: true,
      message: analysisStarted
        ? `${successCount} files uploaded and analysis started automatically`
        : `${successCount} files uploaded successfully`,
      results,
      summary: {
        total: files.length,
        successful: successCount,
        failed: failCount,
        totalUploadDuration,
        overallDuration,
      },
      analysisStarted,
      analyses: serializeAnalyses(analyses)
    });

  } catch (error) {
    Logger.error('[Upload API] POST request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const optimized = searchParams.get('optimized') !== 'false'; // Default to optimized
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    Logger.info(`[Upload API] Fetching uploads for user: ${user.id}, optimized: ${optimized}`);

    if (optimized) {
      // Use optimized database operations
      const { OptimizedDatabaseStorage } = await import('../../../lib/db-optimized');
      const result = await OptimizedDatabaseStorage.getUploadsListByUser(user.id, page, limit);
      
      // Transform to match expected format
      const uploads = result.uploads.map(upload => ({
        ...upload,
        analyses: upload.analyses || [],
      }));

      const { serializeBigInt } = await import('../../../lib/serialization');
      
      return NextResponse.json({
        success: true,
        uploads: serializeBigInt(uploads),
        pagination: result.pagination,
        optimized: true,
        bandwidthSaving: '~70% reduction compared to full data loading',
      });
    } else {
      // Legacy full data loading
      const uploads = await DatabaseStorage.getUploadsByUser(user.id);
      const { serializeUploads } = await import('../../../lib/serialization');

      return NextResponse.json({
        success: true,
        uploads: serializeUploads(uploads),
        optimized: false,
        warning: 'Using legacy full data loading - consider using optimized=true',
      });
    }

  } catch (error) {
    Logger.error('[Upload API] GET request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch uploads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/upload:
 *   delete:
 *     tags: [File Management]
 *     summary: Delete an uploaded file
 *     description: Delete an uploaded file and its associated analyses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the upload to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
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
 *                   example: "Upload deleted successfully"
 *       400:
 *         description: Missing upload ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Upload not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorized to delete this upload
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

    // Get upload ID from query parameters
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('id');

    if (!uploadId) {
      return NextResponse.json({
        success: false,
        error: 'Upload ID is required'
      }, { status: 400 });
    }

    Logger.info('[Upload API] Deleting upload:', uploadId, 'for user:', user.id);

    // First, get the upload to verify ownership and get file details
    const upload = await DatabaseStorage.getUploadById(uploadId);
    
    if (!upload) {
      return NextResponse.json({
        success: false,
        error: 'Upload not found'
      }, { status: 404 });
    }

    // Verify that the user owns this upload
    if (upload.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authorized to delete this upload'
      }, { status: 403 });
    }

    // Delete the file from R2 storage
    try {
      if (upload.fileUrl) {
        await r2.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: upload.fileUrl,
        }));
        Logger.info('[Upload API] Deleted file from R2:', upload.fileUrl);
      }
    } catch (error) {
      Logger.warn('[Upload API] Failed to delete file from R2 (file may not exist):', error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete the upload record from database (cascade delete will handle related analyses)
    await DatabaseStorage.deleteUpload(uploadId);

    Logger.info('[Upload API] Successfully deleted upload:', uploadId);

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully'
    });

  } catch (error) {
    Logger.error('[Upload API] DELETE request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}