// Production logging configuration
export const LoggingConfig = {
  // Enable comprehensive logging in production
  enableProductionLogs: process.env.NODE_ENV === 'production',
  
  // Database operation logging
  enableDatabaseLogs: process.env.ENABLE_DATABASE_LOGS === 'true' || process.env.NODE_ENV === 'development',
  
  // Analysis debugging
  enableAnalysisDebug: process.env.ENABLE_ANALYSIS_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  
  // Log levels
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Timeout configurations
  timeouts: {
    transcription: parseInt(process.env.TRANSCRIPTION_TIMEOUT_MS || '300000'), // 5 minutes
    analysis: parseInt(process.env.ANALYSIS_TIMEOUT_MS || '900000'), // 15 minutes
    customAnalysis: parseInt(process.env.ANALYSIS_TIMEOUT_MS || '600000'), // 10 minutes
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000'), // 30 seconds
  },
  
  // Performance monitoring
  slowOperationThreshold: parseInt(process.env.SLOW_OPERATION_THRESHOLD_MS || '10000'), // 10 seconds
  
  // Error reporting
  enableErrorReporting: process.env.NODE_ENV === 'production',
  
  // System health monitoring
  enableSystemHealthLogs: true,
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '60000'), // 1 minute
  
  // Analysis monitoring configuration
  monitoring: {
    intervalMs: parseInt(process.env.ANALYSIS_MONITOR_INTERVAL_MS || '60000'), // 1 minute
    stuckAnalysisThresholdMs: parseInt(process.env.STUCK_ANALYSIS_THRESHOLD_MS || '300000'), // 5 minutes
    longRunningAnalysisThresholdMs: parseInt(process.env.LONG_RUNNING_ANALYSIS_THRESHOLD_MS || '900000'), // 15 minutes
    staleAnalysisThresholdMs: parseInt(process.env.STALE_ANALYSIS_THRESHOLD_MS || '1800000'), // 30 minutes
  }
};

// Enhanced error categorization
export const ErrorCategories = {
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT', 
  AUTH_ERROR: 'AUTH_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  API_ERROR: 'API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorCategory = typeof ErrorCategories[keyof typeof ErrorCategories];

// Production monitoring utilities
export const ProductionMonitoring = {
  // Log critical operation metrics
  logOperationMetrics: (operation: string, duration: number, success: boolean, metadata?: any) => {
    if (LoggingConfig.enableProductionLogs) {
      console.log(JSON.stringify({
        type: 'OPERATION_METRIC',
        timestamp: new Date().toISOString(),
        operation,
        duration,
        success,
        metadata,
        environment: process.env.NODE_ENV
      }));
    }
  },
  
  // Log system resource usage
  logSystemResources: () => {
    if (LoggingConfig.enableSystemHealthLogs) {
      const memUsage = process.memoryUsage();
      console.log(JSON.stringify({
        type: 'SYSTEM_HEALTH',
        timestamp: new Date().toISOString(),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(process.uptime()) + 's',
        platform: process.platform,
        nodeVersion: process.version
      }));
    }
  },
  
  // Log error with categorization
  logCategorizedError: (category: ErrorCategory, error: Error, context?: any) => {
    console.error(JSON.stringify({
      type: 'CATEGORIZED_ERROR',
      timestamp: new Date().toISOString(),
      category,
      message: error.message,
      stack: error.stack,
      context,
      environment: process.env.NODE_ENV
    }));
  }
};

// Initialize production monitoring
if (LoggingConfig.enableProductionLogs) {
  // Log system health periodically
  setInterval(() => {
    ProductionMonitoring.logSystemResources();
  }, LoggingConfig.healthCheckInterval);
  
  // Log startup information
  console.log(JSON.stringify({
    type: 'STARTUP',
    timestamp: new Date().toISOString(),
    config: {
      logLevel: LoggingConfig.logLevel,
      enableDatabaseLogs: LoggingConfig.enableDatabaseLogs,
      enableAnalysisDebug: LoggingConfig.enableAnalysisDebug,
      timeouts: LoggingConfig.timeouts
    },
    environment: process.env.NODE_ENV
  }));
}
