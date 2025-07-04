# Database Timeout Issues Resolution Guide

## Overview
This guide addresses PostgreSQL timeout issues commonly encountered with Neon database during call analysis operations.

## Problem Analysis
The error `Can't reach database server at ep-restless-boat-a147mwln-pooler.ap-southeast-1.aws.neon.tech:5432` indicates:
- Connection timeout to Neon PostgreSQL database
- Network connectivity issues or database server unavailability
- Connection pool exhaustion

## Solutions Implemented

### 1. Enhanced Database Configuration
- **File**: `src/lib/db-enhanced.ts`
- **Features**:
  - Automatic retry logic with exponential backoff
  - Connection timeout handling (30 seconds)
  - Query timeout handling (60 seconds)
  - Connection pooling optimization

### 2. Retry Mechanism
- **Maximum Retries**: 3 attempts
- **Base Delay**: 1 second
- **Exponential Backoff**: Delay increases with each retry
- **Maximum Delay**: 30 seconds

### 3. Enhanced Database Storage
- **File**: `src/lib/db-enhanced-storage.ts`
- **Features**:
  - All database operations wrapped with retry logic
  - Specific error handling for Prisma client errors
  - Optimized query patterns

### 4. Connection String Optimization
- **File**: `src/lib/db-connection-config.ts`
- **Features**:
  - Neon-specific connection parameters
  - Connection pooling configuration
  - Keep-alive settings
  - SSL mode configuration

### 5. Database Monitoring
- **File**: `src/lib/db-monitor.ts`
- **Features**:
  - Continuous health monitoring
  - Performance metrics tracking
  - Error rate monitoring
  - Latency tracking

## Configuration Changes

### Environment Variables
Add these to your `.env` file for optimal Neon performance:

```env
# Enhanced DATABASE_URL for Neon
DATABASE_URL="postgresql://username:password@ep-restless-boat-a147mwln-pooler.ap-southeast-1.aws.neon.tech:5432/database?sslmode=require&connect_timeout=30&statement_timeout=60000&pool_timeout=30&pool_max=10&keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=3&application_name=sales-analyser"
```

### Neon-Specific Optimizations
- **Connection Pooling**: Use pooled connections (`-pooler` endpoint)
- **SSL Mode**: Required for Neon connections
- **Keep-Alive**: Prevents connection drops
- **Application Name**: For monitoring and debugging

## Usage

### 1. Update Import Statements
Replace existing database imports with enhanced versions:

```typescript
// Old import
import { DatabaseStorage } from '@/lib/db';

// New import
import { EnhancedDatabaseStorage } from '@/lib/db-enhanced-storage';
```

### 2. Update Database Calls
Replace database operations with enhanced versions:

```typescript
// Old code
await DatabaseStorage.updateAnalysis(analysisId, updates);

// New code
await EnhancedDatabaseStorage.updateAnalysis(analysisId, updates);
```

### 3. Monitor Database Health
Use the health check endpoint to monitor database status:

```bash
# Check database health
curl http://localhost:3000/api/health/database

# Start monitoring
curl -X POST http://localhost:3000/api/health/database \
  -H "Content-Type: application/json" \
  -d '{"action": "start-monitoring"}'
```

## Troubleshooting Steps

### 1. Immediate Actions
If you encounter timeout errors:

1. **Check Database Status**:
   ```bash
   curl http://localhost:3000/api/health/database
   ```

2. **Verify Connection String**:
   - Ensure DATABASE_URL includes timeout parameters
   - Check if using pooled endpoint (`-pooler`)

3. **Monitor Logs**:
   - Look for retry attempts in application logs
   - Check for connection pool exhaustion

### 2. Neon-Specific Checks
1. **Verify Neon Status**:
   - Check Neon dashboard for database availability
   - Verify connection limits aren't exceeded

2. **Connection String Format**:
   ```
   postgresql://username:password@host-pooler.region.aws.neon.tech:5432/database?sslmode=require&connect_timeout=30
   ```

3. **Network Connectivity**:
   - Test connection from your deployment environment
   - Check firewall rules if using private network

### 3. Performance Optimization
1. **Connection Pooling**:
   - Always use pooled connections for production
   - Monitor connection pool usage

2. **Query Optimization**:
   - Use selective field loading
   - Implement pagination for large datasets
   - Consider using optimized database storage

3. **Monitoring**:
   - Enable continuous health monitoring
   - Track error rates and latency
   - Set up alerts for high error rates

## Error Codes Reference

### Prisma Error Codes (Retryable)
- `P1001`: Can't reach database server
- `P1002`: Database server reached but timed out
- `P1008`: Operations timed out
- `P1017`: Server has closed the connection

### Common Error Messages
- "connection timeout"
- "connection refused"
- "database server is starting up"
- "too many connections"
- "network error"

## Best Practices

### 1. Code Implementation
- Always use enhanced database storage for new features
- Implement proper error handling
- Add logging for database operations
- Use connection pooling

### 2. Production Deployment
- Use environment-specific connection strings
- Enable monitoring and alerting
- Implement health checks
- Set up automated retries

### 3. Monitoring
- Track database performance metrics
- Monitor connection pool usage
- Set up alerts for high error rates
- Regular health checks

## API Endpoints

### Health Check
- **GET** `/api/health/database` - Get database status
- **POST** `/api/health/database` - Control monitoring

### Analysis (Enhanced)
- Uses enhanced database storage with retry logic
- Automatic timeout handling
- Connection pool optimization

## Support

For additional support:
1. Check Neon database dashboard
2. Review application logs for retry attempts
3. Monitor connection pool usage
4. Use health check endpoint for diagnostics

The enhanced database configuration provides robust handling of timeout issues commonly encountered with serverless PostgreSQL databases like Neon.
