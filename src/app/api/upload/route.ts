import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { MemoryStorage } from '@/lib/memory-storage';

// File validation constants
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',     // MP3
  'audio/wav',      // WAV
  'audio/x-wav',    // WAV alternative
  'audio/mp4',      // M4A
  'audio/aac',      // AAC
  'audio/ogg',      // OGG
  'audio/flac',     // FLAC
  'audio/webm',     // WebM
];

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'];

function isValidAudioFile(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(`.${extension}`);
}

export async function POST(request: NextRequest) {
  Logger.info('[Upload API] Starting in-memory file upload process');
  
  try {
    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userId = formData.get('userId') as string;

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

    for (const file of files) {
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

        // Store file metadata and buffer in memory
        const uploadRecord = MemoryStorage.createUpload({
          filename: file.name,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          fileBuffer: buffer,
          userId: userId,
        });

        results.push({
          id: uploadRecord.id,
          filename: file.name,
          size: file.size,
          type: file.type,
          success: true,
          uploadedAt: uploadRecord.uploadedAt
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

    Logger.info('[Upload API] Upload complete. Success:', successCount, 'Failed:', failCount);

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
          
        const analyzeResponse = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uploadIds: uploadIds,
            analysisType: 'default',
            userId: userId,
            autoTriggered: true
          })
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
        failed: failCount
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

    // Get uploads with analysis information from memory
    const uploads = MemoryStorage.getUploadsWithAnalyses(userId);

    return NextResponse.json({
      success: true,
      uploads
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