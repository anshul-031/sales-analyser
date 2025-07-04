/**
 * Database Connection Configuration for Neon PostgreSQL
 * This module provides enhanced connection configuration with timeout settings
 */

import { Logger } from './utils';
import { DATABASE_CONFIG } from './constants';

/**
 * Enhanced database URL with connection parameters for Neon
 */
export function getEnhancedDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse the URL to add connection parameters
  const url = new URL(baseUrl);
  
  // Add connection timeout parameters
  const params = new URLSearchParams();
  
  // Connection timeout (in seconds)
  params.set('connect_timeout', Math.floor(DATABASE_CONFIG.CONNECTION_TIMEOUT / 1000).toString());
  
  // Query timeout (in seconds) 
  params.set('statement_timeout', Math.floor(DATABASE_CONFIG.QUERY_TIMEOUT / 1000).toString());
  
  // Connection pool settings
  params.set('pool_timeout', Math.floor(DATABASE_CONFIG.CONNECTION_POOL.TIMEOUT / 1000).toString());
  params.set('pool_max', DATABASE_CONFIG.CONNECTION_POOL.MAX.toString());
  
  // SSL configuration for Neon
  if (url.hostname.includes('neon.tech')) {
    params.set('sslmode', 'require');
  }
  
  // Connection keep-alive settings
  params.set('keepalives', '1');
  params.set('keepalives_idle', '30');
  params.set('keepalives_interval', '10');
  params.set('keepalives_count', '3');
  
  // Application name for monitoring
  params.set('application_name', 'sales-analyser');
  
  // Add existing search params
  url.searchParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });
  
  // Construct the enhanced URL
  url.search = params.toString();
  
  Logger.info('[Database] Using enhanced connection URL with timeout configuration');
  return url.toString();
}

/**
 * Validate database connection configuration
 */
export function validateDatabaseConfig(): void {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  try {
    const url = new URL(dbUrl);
    
    // Check if it's a valid PostgreSQL URL
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new Error('DATABASE_URL must be a PostgreSQL connection string');
    }
    
    // Check for required components
    if (!url.hostname) {
      throw new Error('DATABASE_URL must include a hostname');
    }
    
    if (!url.pathname || url.pathname === '/') {
      throw new Error('DATABASE_URL must include a database name');
    }
    
    Logger.info('[Database] Connection configuration validated successfully');
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid DATABASE_URL: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get connection status information
 */
export function getConnectionInfo(): {
  host: string;
  database: string;
  port: number;
  ssl: boolean;
  timeout: number;
} {
  const url = new URL(process.env.DATABASE_URL || '');
  
  return {
    host: url.hostname,
    database: url.pathname.slice(1), // Remove leading slash
    port: parseInt(url.port) || 5432,
    ssl: url.hostname.includes('neon.tech') || url.searchParams.get('sslmode') === 'require',
    timeout: DATABASE_CONFIG.CONNECTION_TIMEOUT,
  };
}

/**
 * Check if we're using Neon database
 */
export function isNeonDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  return url?.includes('neon.tech') || false;
}

/**
 * Get recommended connection string for Neon
 */
export function getNeonRecommendedUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const url = new URL(baseUrl);
  
  // Neon-specific optimizations
  const neonParams = new URLSearchParams();
  
  // Connection settings optimized for Neon
  neonParams.set('connect_timeout', '30'); // 30 seconds
  neonParams.set('statement_timeout', '60000'); // 60 seconds in milliseconds
  neonParams.set('idle_timeout', '10000'); // 10 seconds
  neonParams.set('sslmode', 'require');
  neonParams.set('application_name', 'sales-analyser');
  
  // Connection pooling for Neon
  neonParams.set('pool_timeout', '30');
  neonParams.set('pool_max', '10');
  
  // Keep-alive settings for better stability
  neonParams.set('keepalives', '1');
  neonParams.set('keepalives_idle', '30');
  neonParams.set('keepalives_interval', '10');
  neonParams.set('keepalives_count', '3');
  
  url.search = neonParams.toString();
  
  return url.toString();
}

const dbConnectionConfig = {
  getEnhancedDatabaseUrl,
  validateDatabaseConfig,
  getConnectionInfo,
  isNeonDatabase,
  getNeonRecommendedUrl,
};

export default dbConnectionConfig;
