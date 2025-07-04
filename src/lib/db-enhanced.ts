/**
 * Enhanced Database Configuration with Timeout and Retry Handling
 * This file provides robust database connection management for PostgreSQL/Neon
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from './utils';
import { DATABASE_CONFIG } from './constants';

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with enhanced configuration for timeout handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Note: Prisma client-level timeout configuration is handled through connection string
  // and our retry wrapper functions
});

// In development, save the Prisma client to the global object
// to prevent creating multiple instances during hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Enhanced retry logic with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = DATABASE_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if this is a timeout or connection error
      const isRetryableError = isRetryableDbError(error);
      
      if (!isRetryableError || attempt === maxRetries) {
        Logger.error(`[Database] ${operationName} failed after ${attempt} attempts:`, error);
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        DATABASE_CONFIG.BASE_RETRY_DELAY * Math.pow(2, attempt - 1),
        DATABASE_CONFIG.MAX_RETRY_DELAY
      );
      
      Logger.warn(`[Database] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Check if an error is retryable
 */
function isRetryableDbError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  
  // Prisma error codes that are retryable
  const retryablePrismaCodes = [
    'P1001', // Can't reach database server
    'P1002', // The database server was reached but timed out
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
  ];
  
  // Common timeout/connection error messages
  const retryableMessages = [
    'connection timeout',
    'connection refused',
    'timeout',
    'timed out',
    'connection lost',
    'server closed',
    'connection reset',
    'network error',
    'tcp error',
    'connection pool',
    'connection limit',
    'temporary failure',
    'database server is starting up',
    'too many connections',
    'connection string is invalid',
    'can\'t reach database server',
    'database server was reached but timed out',
  ];
  
  return (
    retryablePrismaCodes.includes(errorCode) ||
    retryableMessages.some(msg => errorMessage.includes(msg))
  );
}

/**
 * Enhanced connection function with timeout and retry
 */
export async function connectToDatabase(): Promise<boolean> {
  return withRetry(async () => {
    await prisma.$connect();
    Logger.info('[Database] Connected to PostgreSQL database');
    return true;
  }, 'Database Connection').catch(() => false);
}

/**
 * Enhanced disconnection function
 */
export async function disconnectFromDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    Logger.info('[Database] Disconnected from PostgreSQL database');
  } catch (error) {
    Logger.error('[Database] Error disconnecting from database:', error);
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await withRetry(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }, 'Database Health Check');
    return true;
  } catch (error) {
    Logger.error('[Database] Health check failed:', error);
    return false;
  }
}

/**
 * Enhanced database operation wrapper
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(operation, operationName);
}

export default prisma;
