/**
 * Serialization utilities for handling BigInt, Date, and other non-JSON-serializable types
 */

/**
 * Recursively converts BigInt values to strings and Date objects to ISO strings in an object
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle Date objects by converting them to ISO strings
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Handle specific date fields that might need special treatment
      if ((key === 'uploadedAt' || key === 'createdAt' || key === 'updatedAt') && value) {
        if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (typeof value === 'string') {
          // Ensure it's a valid ISO string
          try {
            const date = new Date(value);
            serialized[key] = date.toISOString();
          } catch {
            serialized[key] = value;
          }
        } else {
          serialized[key] = serializeBigInt(value);
        }
      } else {
        serialized[key] = serializeBigInt(value);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Serializes an upload object with all nested fields
 */
export function serializeUpload(upload: any): any {
  return serializeBigInt(upload);
}

/**
 * Serializes an analysis object with all nested fields
 */
export function serializeAnalysis(analysis: any): any {
  return serializeBigInt(analysis);
}

/**
 * Serializes an array of uploads
 */
export function serializeUploads(uploads: any[]): any[] {
  return uploads.map(serializeUpload);
}

/**
 * Serializes an array of analyses
 */
export function serializeAnalyses(analyses: any[]): any[] {
  return analyses.map(serializeAnalysis);
}
