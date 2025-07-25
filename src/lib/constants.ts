/**
 * Application Constants
 * Centralized configuration values for the Sales Analyzer application
 */

// File Upload Configuration
export const FILE_UPLOAD_CONFIG = {
  // Maximum file size in bytes (200MB)
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  
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

// Polling Configuration
export const POLLING_CONFIG = {
  // Interval for polling analysis status (2 minutes for more conservative approach)
  ANALYSIS_STATUS_INTERVAL: 120 * 1000, // 2 minutes in milliseconds
  
  // Maximum polling duration (30 minutes)
  MAX_POLLING_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
  
  // Debounce delay for visibility changes
  VISIBILITY_DEBOUNCE_DELAY: 500, // 500ms
} as const;

// Database Configuration
export const DATABASE_CONFIG = {
  // Connection timeout in milliseconds (30 seconds)
  CONNECTION_TIMEOUT: 30 * 1000,
  
  // Query timeout in milliseconds (60 seconds)
  QUERY_TIMEOUT: 60 * 1000,
  
  // Maximum number of retries for database operations
  MAX_RETRIES: 3,
  
  // Base delay for exponential backoff (1 second)
  BASE_RETRY_DELAY: 1000,
  
  // Maximum delay for exponential backoff (30 seconds)
  MAX_RETRY_DELAY: 30 * 1000,
  
  // Connection pool settings
  CONNECTION_POOL: {
    MIN: 2,
    MAX: 10,
    TIMEOUT: 30000, // 30 seconds
    IDLE_TIMEOUT: 10000, // 10 seconds
  },
} as const;

// Export commonly used values for convenience
export const MAX_FILE_SIZE = FILE_UPLOAD_CONFIG.MAX_FILE_SIZE;
export const MAX_FILES = FILE_UPLOAD_CONFIG.MAX_FILES;
export const CHUNK_SIZE = FILE_UPLOAD_CONFIG.CHUNK_SIZE;
export const CONNECTION_TIMEOUT = DATABASE_CONFIG.CONNECTION_TIMEOUT;
export const QUERY_TIMEOUT = DATABASE_CONFIG.QUERY_TIMEOUT;
export const MAX_RETRIES = DATABASE_CONFIG.MAX_RETRIES;