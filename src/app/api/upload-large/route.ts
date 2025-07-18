import { getAuthenticatedUser } from '@/lib/auth';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Validate required environment variables
const requiredEnvVars = {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const isDevelopment = process.env.NODE_ENV === 'development';

if (missingEnvVars.length > 0) {
  Logger.error('[Upload API] Missing required environment variables:', missingEnvVars);
  if (!isDevelopment) {
    Logger.error('[Upload API] R2 configuration is required in production');
  } else {
    Logger.info('[Upload API] Development mode: R2 not configured, will use local storage fallback');
  }
}

// Only initialize R2 if all environment variables are present
let r2: S3Client | null = null;
if (missingEnvVars.length === 0) {
  r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(request: NextRequest) {
  // Check for missing environment variables in production
  if (missingEnvVars.length > 0 && !isDevelopment) {
    return NextResponse.json({
      success: false,
      error: `Missing required environment variables: ${missingEnvVars.join(', ')}`
    }, { status: 500 });
  }

  // Check authentication for all actions
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required'
    }, { status: 401 });
  }

  let params;
  try {
    params = await request.json();
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  
  const { action } = params;

  switch (action) {
    case 'start-upload':
      return await startUpload(params, user);
    case 'get-upload-urls':
      return await getUploadUrls(params);
    case 'complete-upload':
      return await completeUpload(request, params, user);
    case 'abort-upload':
        return await abortUpload(params);
    default:
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }
}

async function startUpload(params: any, user: any) {
    const { fileName, filename, contentType, mimeType, fileSize } = params;
    const currentFilename = fileName || filename;
    const currentContentType = contentType || mimeType;

    // Validate required parameters
    if (!currentFilename || !currentContentType || !fileSize) {
        return NextResponse.json({ success: false, error: 'Missing required parameters: filename, mimeType, fileSize' }, { status: 400 });
    }

    // Validate file size (200MB limit)
    const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
    if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json({
            success: false,
            error: `File size exceeds the 200MB limit. Current size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`
        }, { status: 400 });
    }

    // Validate MIME type
    const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/flac', 'audio/ogg'];
    if (!ALLOWED_MIME_TYPES.includes(currentContentType)) {
        return NextResponse.json({ success: false, error: `Invalid MIME type: ${currentContentType}` }, { status: 400 });
    }

    // If R2 is not configured (development mode), return a development fallback
    if (!r2) {
        Logger.info('[Upload API] Development mode: Using local storage fallback for upload');
        const uploadId = randomUUID();
        const key = `local-uploads/${user.id}/${uploadId}/${currentFilename}`;
        
        return NextResponse.json({
            success: true,
            uploadId,
            key,
            isDevelopmentMode: true,
        });
    }

    const uploadId = randomUUID();
    const key = `uploads/${user.id}/${uploadId}/${currentFilename}`;

    try {
        const expires = new Date();
        expires.setDate(expires.getDate() + 1); // 24-hour expiry

        Logger.info('[Upload API] Starting multipart upload:', {
            filename: currentFilename,
            contentType: currentContentType,
            fileSize,
            userId: user.id,
            key
        });

        const multipartUpload = await r2.send(
            new CreateMultipartUploadCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
                ContentType: currentContentType,
                Expires: expires,
            })
        );

        Logger.info('[Upload API] Multipart upload started successfully:', {
            uploadId: multipartUpload.UploadId,
            key
        });

        return NextResponse.json({
            success: true,
            uploadId: multipartUpload.UploadId,
            key: key,
        });
    } catch (error) {
        Logger.error('[Upload API] Error starting multipart upload:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            filename: currentFilename,
            contentType: currentContentType,
            fileSize,
            userId: user.id,
            key
        });
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to start upload',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

async function getUploadUrls({ key, uploadId, parts }: { key: string, uploadId: string, parts: number }) {
    // Development mode fallback
    if (!r2) {
        Logger.info('[Upload API] Development mode: Generating mock upload URLs');
        const urls = [];
        for (let i = 1; i <= parts; i++) {
            // Generate mock URLs for development
            urls.push(`http://localhost:3000/api/upload-large/mock-upload?part=${i}&uploadId=${uploadId}&key=${encodeURIComponent(key)}`);
        }
        return NextResponse.json({ success: true, urls, isDevelopmentMode: true });
    }

    try {
        const urls = [];
        for (let i = 1; i <= parts; i++) {
            const command = new UploadPartCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
                UploadId: uploadId,
                PartNumber: i,
            });
            const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
            urls.push(url);
        }
        return NextResponse.json({ success: true, urls });
    } catch (error) {
        Logger.error('[Upload API] Error getting signed URLs:', error);
        return NextResponse.json({ success: false, error: 'Failed to get upload URLs' }, { status: 500 });
    }
}

async function completeUpload(request: NextRequest, params: any, user: any) {
    const { 
        key, 
        uploadId, 
        parts, 
        fileName, 
        contentType, 
        fileSize, 
        customParameters, 
        selectedActionItemTypes,
        originalContentType 
    } = params;
    
    const startTime = Date.now();
    try {
        // Development mode fallback
        if (!r2) {
            Logger.info('[Upload API] Development mode: Skipping R2 complete upload, creating local upload record');
        } else {
            await r2.send(
                new CompleteMultipartUploadCommand({
                    Bucket: process.env.R2_BUCKET_NAME!,
                    Key: key,
                    UploadId: uploadId,
                    MultipartUpload: { Parts: parts },
                })
            );
        }

        const newUpload = await DatabaseStorage.createUpload({
            filename: fileName,
            originalName: fileName,
            fileSize: fileSize,
            mimeType: originalContentType,
            fileUrl: key,
            userId: user.id,
        });

        // Trigger analysis
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
        const baseUrl = `${protocol}://${host}`;

        // Validate the upload ID before sending to analyze API
        if (!newUpload.id || typeof newUpload.id !== 'string') {
            Logger.error('[Upload Large API] Invalid upload ID:', newUpload.id);
            return NextResponse.json({
                success: false,
                error: 'Upload created but analysis could not be started due to invalid upload ID'
            }, { status: 500 });
        }

        const analysisPayload = {
            uploadIds: [newUpload.id],
            analysisType: 'parameters',
            customParameters: customParameters || [],
            selectedActionItemTypes: selectedActionItemTypes || [],
            userId: user.id,
            autoTriggered: true
        };

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

        let analysisStarted = false;
        let analyses = [];
        if (analyzeResponse.status === 200) {
            const analyzeResult = await analyzeResponse.json();
            analysisStarted = true;
            analyses = analyzeResult.analyses || [];
            Logger.info('[Upload API] Analysis auto-started successfully for', newUpload.id);
        } else {
            Logger.warn('[Upload API] Failed to auto-start analysis, status:', analyzeResponse.status);
        }
        
        const uploadDuration = Date.now() - startTime;

        // Import serialization utility
        const { serializeUpload, serializeAnalyses } = await import('../../../lib/serialization');

        return NextResponse.json({
            success: true,
            message: analysisStarted ? `File uploaded and analysis started.` : `File uploaded successfully.`,
            results: [{ id: newUpload.id, filename: fileName, success: true, uploadId: newUpload.id, uploadDuration }],
            summary: { total: 1, successful: 1, failed: 0, totalUploadDuration: uploadDuration, overallDuration: uploadDuration },
            analysisStarted,
            analyses: serializeAnalyses(analyses),
            upload: serializeUpload(newUpload)
        });

    } catch (error) {
        Logger.error('[Upload API] Error completing multipart upload:', error);
        return NextResponse.json({ success: false, error: 'Failed to complete upload' }, { status: 500 });
    }
}

async function abortUpload({ key, uploadId }: { key: string, uploadId: string }) {
    try {
        // Development mode fallback
        if (!r2) {
            Logger.info('[Upload API] Development mode: Skipping R2 abort upload');
            return NextResponse.json({ success: true, isDevelopmentMode: true });
        }

        await r2.send(
            new AbortMultipartUploadCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
                UploadId: uploadId,
            })
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        Logger.error('[Upload API] Error aborting multipart upload:', error);
        return NextResponse.json({ success: false, error: 'Failed to abort upload' }, { status: 500 });
    }
}