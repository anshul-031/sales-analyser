/**
 * Database Monitoring and Health Check Utility
 * Provides monitoring and health check functionality for PostgreSQL/Neon database
 */

import { Logger } from './utils';
import { EnhancedDatabaseStorage } from './db-enhanced-storage';
import { checkDatabaseHealth } from './db-enhanced';
import { getConnectionInfo, isNeonDatabase } from './db-connection-config';

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  latency: number;
  error?: string;
  connectionInfo: ReturnType<typeof getConnectionInfo>;
  timestamp: Date;
}

export interface DatabaseMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageLatency: number;
  lastHealthCheck: Date;
  uptime: number;
}

class DatabaseMonitor {
  private metrics: DatabaseMetrics;
  private startTime: Date;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageLatency: 0,
      lastHealthCheck: new Date(),
      uptime: 0,
    };
    this.startTime = new Date();
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        Logger.error('[Database Monitor] Health check failed:', error);
      }
    }, intervalMs);

    Logger.info('[Database Monitor] Started continuous monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    Logger.info('[Database Monitor] Stopped monitoring');
  }

  /**
   * Perform a health check
   */
  async performHealthCheck(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await checkDatabaseHealth();
      const latency = Date.now() - startTime;
      
      const status: DatabaseHealthStatus = {
        isHealthy,
        latency,
        connectionInfo: getConnectionInfo(),
        timestamp: new Date(),
      };

      this.metrics.totalQueries++;
      if (isHealthy) {
        this.metrics.successfulQueries++;
      } else {
        this.metrics.failedQueries++;
      }
      
      this.updateAverageLatency(latency);
      this.metrics.lastHealthCheck = new Date();
      this.metrics.uptime = Date.now() - this.startTime.getTime();

      Logger.info(`[Database Monitor] Health check completed in ${latency}ms - ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      
      return status;
      
    } catch (error) {
      const latency = Date.now() - startTime;
      const status: DatabaseHealthStatus = {
        isHealthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionInfo: getConnectionInfo(),
        timestamp: new Date(),
      };

      this.metrics.totalQueries++;
      this.metrics.failedQueries++;
      this.updateAverageLatency(latency);
      this.metrics.lastHealthCheck = new Date();

      Logger.error(`[Database Monitor] Health check failed in ${latency}ms:`, error);
      
      return status;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  /**
   * Get detailed database status
   */
  async getDetailedStatus(): Promise<{
    health: DatabaseHealthStatus;
    metrics: DatabaseMetrics;
    connectionInfo: ReturnType<typeof getConnectionInfo>;
    isNeon: boolean;
  }> {
    const health = await this.performHealthCheck();
    const metrics = this.getMetrics();
    const connectionInfo = getConnectionInfo();
    const isNeon = isNeonDatabase();

    return {
      health,
      metrics,
      connectionInfo,
      isNeon,
    };
  }

  /**
   * Test database operations
   */
  async testDatabaseOperations(): Promise<{
    success: boolean;
    operations: Array<{ name: string; success: boolean; duration: number; error?: string }>;
  }> {
    const operations = [];
    let overallSuccess = true;

    // Test 1: Basic health check
    const healthStart = Date.now();
    try {
      await EnhancedDatabaseStorage.healthCheck();
      operations.push({
        name: 'Health Check',
        success: true,
        duration: Date.now() - healthStart,
      });
    } catch (error) {
      operations.push({
        name: 'Health Check',
        success: false,
        duration: Date.now() - healthStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      overallSuccess = false;
    }

    // Test 2: Simple query
    const queryStart = Date.now();
    try {
      await EnhancedDatabaseStorage.getAnalysesByUser('test-user-id');
      operations.push({
        name: 'Simple Query',
        success: true,
        duration: Date.now() - queryStart,
      });
    } catch (error) {
      operations.push({
        name: 'Simple Query',
        success: false,
        duration: Date.now() - queryStart,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      overallSuccess = false;
    }

    return {
      success: overallSuccess,
      operations,
    };
  }

  /**
   * Get recommendations based on current status
   */
  getRecommendations(): string[] {
    const recommendations = [];
    const metrics = this.getMetrics();

    if (metrics.failedQueries > 0) {
      const errorRate = (metrics.failedQueries / metrics.totalQueries) * 100;
      if (errorRate > 10) {
        recommendations.push('High error rate detected. Consider checking network connectivity or database configuration.');
      }
    }

    if (metrics.averageLatency > 5000) {
      recommendations.push('High latency detected. Consider optimizing queries or checking network conditions.');
    }

    if (isNeonDatabase()) {
      recommendations.push('Using Neon database. Consider implementing connection pooling for better performance.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Database appears to be operating normally.');
    }

    return recommendations;
  }

  private updateAverageLatency(newLatency: number): void {
    const totalLatency = this.metrics.averageLatency * this.metrics.totalQueries;
    this.metrics.averageLatency = (totalLatency + newLatency) / (this.metrics.totalQueries + 1);
  }
}

// Create singleton instance
export const databaseMonitor = new DatabaseMonitor();

// Utility functions
export async function quickHealthCheck(): Promise<DatabaseHealthStatus> {
  return databaseMonitor.performHealthCheck();
}

export async function getDatabaseStatus(): Promise<{
  health: DatabaseHealthStatus;
  metrics: DatabaseMetrics;
  recommendations: string[];
}> {
  const health = await databaseMonitor.performHealthCheck();
  const metrics = databaseMonitor.getMetrics();
  const recommendations = databaseMonitor.getRecommendations();

  return {
    health,
    metrics,
    recommendations,
  };
}

export function startDatabaseMonitoring(): void {
  databaseMonitor.startMonitoring();
}

export function stopDatabaseMonitoring(): void {
  databaseMonitor.stopMonitoring();
}

export default databaseMonitor;
