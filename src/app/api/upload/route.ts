import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { DatabaseStorage } from '@/lib/db';
import { FILE_UPLOAD_CONFIG } from '@/lib/constants';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = formData.get('userId') as string;
    const customParametersStr = formData.get('customParameters') as string;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 });
    }

    Logger.info('[Upload API] Processing', files.length, 'files for user:', userId);

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

        const key = `uploads/${userId}/${file.name}`;
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
          userId: userId,
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
              userId: userId,
              autoTriggered: true
            };
          } catch (error) {
            Logger.warn('[Upload API] Failed to parse custom parameters, using default analysis');
            analysisPayload = {
              uploadIds: uploadIds,
              analysisType: 'default',
              userId: userId,
              autoTriggered: true
            };
          }
        } else {
          analysisPayload = {
            uploadIds: uploadIds,
            analysisType: 'default',
            userId: userId,
            autoTriggered: true
          };
        }

        const analyzeResponse = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(analysisPayload)
        });

        if (analyzeResponse.ok) {
          const analyzeResult = await analyzeResponse.json();
          analysisStarted = true;
          analyses = analyzeResult.analyses || [];
          Logger.info('[Upload API] Analysis auto-started successfully for', uploadIds.length, 'files');
        } else {
          Logger.warn('[Upload API] Failed to auto-start analysis');
        }
      } catch (error) {
        Logger.error('[Upload API] Error auto-starting analysis:', error);
      }
    }

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
      analyses
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    Logger.info('[Upload API] Fetching uploads for user:', userId);

    // Get uploads with analysis information from database
    const uploads = await DatabaseStorage.getUploadsByUser(userId);

    // Import serialization utility
    const { serializeUploads } = await import('../../../lib/serialization');

    return NextResponse.json({
      success: true,
      uploads: serializeUploads(uploads)
    });

  } catch (error) {
    Logger.error('[Upload API] GET request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch uploads',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}