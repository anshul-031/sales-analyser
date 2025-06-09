import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Time formatter
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Date formatter
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Validate audio file type
export function isValidAudioFile(mimeType: string): boolean {
  const validTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/flac',
    'audio/m4a',
    'audio/mp4'
  ];
  return validTypes.includes(mimeType.toLowerCase());
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
  return `${baseName}_${timestamp}_${random}.${extension}`;
}

// Logger utility
export class Logger {
  private static logLevel = process.env.LOG_LEVEL || 'info';
  
  private static shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel <= currentLevelIndex;
  }
  
  static error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
  
  static warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
  
  static info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
  
  static debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}

// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown): { message: string; statusCode: number } {
  Logger.error('API Error:', error);
  
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  
  if (error instanceof Error) {
    return { message: error.message, statusCode: 500 };
  }
  
  return { message: 'Internal server error', statusCode: 500 };
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return size <= maxSize;
}

// Analysis status helpers
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'processing':
      return 'text-blue-600 bg-blue-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    case 'pending':
    default:
      return 'text-yellow-600 bg-yellow-50';
  }
}

export function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
      return '✓';
    case 'processing':
      return '⟳';
    case 'failed':
      return '✗';
    case 'pending':
    default:
      return '○';
  }
}