/**
 * Application Constants
 * Centralized configuration values for the Sales Analyzer application
 */

// File Upload Configuration
export const FILE_UPLOAD_CONFIG = {
  // Maximum file size in bytes (5MB)
  MAX_FILE_SIZE: 10 * 1024 * 1024 * 1024, // 10GB
  
  // Maximum number of files per upload
  MAX_FILES: 10,

  // Chunk size for large file uploads (5MB)
  CHUNK_SIZE: 5 * 1024 * 1024,
  
  // Supported audio file types
  ALLOWED_MIME_TYPES: [
    'audio/mpeg',     // MP3
    'audio/wav',      // WAV
    'audio/x-wav',    // WAV alternative
    'audio/mp4',      // M4A
    'audio/aac',      // AAC
    'audio/ogg',      // OGG
    'audio/flac',     // FLAC
    'audio/webm',     // WebM
  ],
  
  // Allowed file extensions
  ALLOWED_EXTENSIONS: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'],
} as const;

// User Configuration
export const USER_CONFIG = {
  DEMO_USER_ID: 'demo-user-001',
} as const;

// API Configuration
export const API_CONFIG = {
  ENDPOINTS: {
    UPLOAD: '/api/upload',
    ANALYZE: '/api/analyze',
    CHATBOT: '/api/chatbot',
    CLEANUP: '/api/cleanup',
  },
} as const;

// Export commonly used values for convenience
export const MAX_FILE_SIZE = FILE_UPLOAD_CONFIG.MAX_FILE_SIZE;
export const MAX_FILES = FILE_UPLOAD_CONFIG.MAX_FILES;
export const CHUNK_SIZE = FILE_UPLOAD_CONFIG.CHUNK_SIZE;