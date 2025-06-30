import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { DatabaseStorage } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  // Check authentication for all actions
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'Authentication required'
    }, { status: 401 });
  }

  const params = await request.json();
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

async function startUpload({ fileName, contentType }: { fileName: string, contentType: string }, user: any) {
    const uploadId = randomUUID();
    const key = `uploads/${user.id}/${uploadId}/${fileName}`;

    try {
        const expires = new Date();
        expires.setDate(expires.getDate() + 1); // 24-hour expiry

        const multipartUpload = await r2.send(
            new CreateMultipartUploadCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
                ContentType: contentType,
                Expires: expires,
            })
        );

        return NextResponse.json({
            success: true,
            uploadId: multipartUpload.UploadId,
            key: key,
        });
    } catch (error) {
        Logger.error('[Upload API] Error starting multipart upload:', error);
        return NextResponse.json({ success: false, error: 'Failed to start upload' }, { status: 500 });
    }
}

async function getUploadUrls({ key, uploadId, parts }: { key: string, uploadId: string, parts: number }) {
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
    const { key, uploadId, parts, fileName, contentType, fileSize, customParameters, originalContentType } = params;
    const startTime = Date.now();
    try {
        await r2.send(
            new CompleteMultipartUploadCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            })
        );

        const newUpload = await DatabaseStorage.createUpload({
            filename: fileName,
            originalName: fileName.replace(/.gz$/, ''),
            fileSize: fileSize,
            mimeType: originalContentType,
            fileUrl: key,
            userId: user.id,
        });

        // Trigger analysis
        const host = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
        const baseUrl = `${protocol}://${host}`;

        const analysisPayload = {
            uploadIds: [newUpload.id],
            analysisType: 'parameters',
            customParameters: customParameters || [],
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