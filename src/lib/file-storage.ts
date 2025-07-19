import { Logger } from './utils';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// File cleanup methods - only R2 operations, no local storage
export class FileStorage {
  // File cleanup methods
  static async deleteUploadedFile(fileKey: string): Promise<boolean> {
    try {
      if (!fileKey) {
        Logger.warn('[FileStorage] No file key provided for deletion');
        return false;
      }

      // Delete the object from R2
      try {
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        }));
        Logger.info('[FileStorage] Deleted file from R2:', fileKey);
        return true;
      } catch (r2Error) {
        Logger.warn('[FileStorage] Could not delete file from R2:', fileKey, r2Error);
        return false;
      }
    } catch (error) {
      Logger.error('[FileStorage] Error deleting file:', error);
      return false;
    }
  }

  // Utility methods
  static async clearUserFiles(fileKeys: string[]): Promise<void> {
    // Delete physical files from R2
    for (const fileKey of fileKeys) {
      try {
        await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
        }));
        Logger.info('[FileStorage] Deleted file from R2:', fileKey);
      } catch (error) {
        Logger.warn('[FileStorage] Could not delete file from R2:', fileKey, error);
      }
    }

    Logger.info('[FileStorage] Cleared files:', fileKeys.length);
  }
}