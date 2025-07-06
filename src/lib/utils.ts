import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { MAX_FILE_SIZE } from "@/lib/constants"

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
  private static logLevel = (typeof process !== 'undefined' ? process.env.LOG_LEVEL : 'debug') || 'debug';
  private static isProduction = (typeof process !== 'undefined' ? process.env.NODE_ENV : 'development') === 'production';
  private static enableDatabaseLogs = true; // Always enabled for detailed monitoring
  private static enableAnalysisDebug = true; // Always enabled for detailed monitoring
  private static isServer = typeof process !== 'undefined' && process.stdout;
  
  private static shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel <= currentLevelIndex;
  }
  
  private static formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const env = this.isProduction ? 'PROD' : 'DEV';
    return `[${level.toUpperCase()}] [${env}] ${timestamp} - ${message}`;
  }
  
  static error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      const formattedMessage = this.formatMessage('error', message);
      console.error(formattedMessage, ...args);
      
      // Always log to stderr for better visibility (server-side only)
      if (this.isServer) {
        process.stderr.write(formattedMessage + '\n');
        if (args.length > 0) {
          process.stderr.write(`Additional info: ${JSON.stringify(args, null, 2)}\n`);
        }
      }
    }
  }
  
  static warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      const formattedMessage = this.formatMessage('warn', message);
      console.warn(formattedMessage, ...args);
      
      // Always log to stdout for better visibility (server-side only)
      if (this.isServer) {
        process.stdout.write(formattedMessage + '\n');
      }
    }
  }
  
  static info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      const formattedMessage = this.formatMessage('info', message);
      console.info(formattedMessage, ...args);
      
      // Always log to stdout for better visibility (server-side only)
      if (this.isServer) {
        process.stdout.write(formattedMessage + '\n');
      }
    }
  }
  
  static debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const formattedMessage = this.formatMessage('debug', message);
      console.debug(formattedMessage, ...args);
      
      // Always log debug messages to stdout for comprehensive monitoring (server-side only)
      if (this.isServer) {
        process.stdout.write(formattedMessage + '\n');
      }
    }
  }
  
  // Special methods for database and analysis logging - always enabled
  static database(message: string, ...args: any[]): void {
    this.info(`[DATABASE] ${message}`, ...args);
  }
  
  static analysis(message: string, ...args: any[]): void {
    this.info(`[ANALYSIS] ${message}`, ...args);
  }
  
  // Enhanced logging for critical operations - always enabled
  static production(level: 'error' | 'warn' | 'info', message: string, ...args: any[]): void {
    if (this.isServer) {
      const timestamp = new Date().toISOString();
      const logMessage = `[PRODUCTION-${level.toUpperCase()}] ${timestamp} - ${message}`;
      
      switch (level) {
        case 'error':
          console.error(logMessage, ...args);
          process.stderr.write(logMessage + '\n');
          break;
        case 'warn':
          console.warn(logMessage, ...args);
          process.stdout.write(logMessage + '\n');
          break;
        case 'info':
          console.info(logMessage, ...args);
          process.stdout.write(logMessage + '\n');
          break;
      }
    }
  }
  
  // Method to log system health and performance
  static performance(operation: string, duration: number, details?: any): void {
    const message = `Performance: ${operation} completed in ${duration}ms`;
    if (duration > 10000) { // Log slow operations as warnings
      this.warn(message, details);
    } else {
      this.info(message, details);
    }
  }
  
  // Special method for monitoring logs - always enabled
  static monitor(message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage('info', `[MONITOR] ${message}`);
    console.info(formattedMessage, ...args);
    
    // Always write monitoring logs to stdout for visibility (server-side only)
    if (this.isServer) {
      process.stdout.write(formattedMessage + '\n');
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

export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
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