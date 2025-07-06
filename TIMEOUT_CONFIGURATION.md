# Timeout Configuration for Long-Running Operations

This document explains the timeout configuration system implemented to handle long-running Gemini API operations that can take up to 30 minutes.

## Overview

The timeout system has been redesigned to handle extremely long-running operations without causing premature timeouts. The new system includes:

1. **Adaptive Timeouts**: Automatically adjust based on operation progress
2. **Circuit Breaker Pattern**: Prevents cascading failures
3. **Progressive Logging**: Provides regular status updates
4. **Extended Base Timeouts**: Accommodate 30+ minute operations

## Configuration

### Environment Variables

Add these to your `.env` file to customize timeout behavior:

```bash
# Extended timeout configurations (all in milliseconds)
TRANSCRIPTION_TIMEOUT_MS=1800000          # 30 minutes (was 5 minutes)
ANALYSIS_TIMEOUT_MS=2700000               # 45 minutes (was 15 minutes)
CUSTOM_ANALYSIS_TIMEOUT_MS=2700000        # 45 minutes (was 10 minutes)
GEMINI_API_TIMEOUT_MS=2700000             # 45 minutes for Gemini API calls
LONG_RUNNING_TIMEOUT_MS=3600000           # 1 hour for extremely long operations
BACKGROUND_PROCESSING_TIMEOUT_MS=3600000  # 1 hour for background processing

# Progress monitoring
HEARTBEAT_INTERVAL_MS=30000               # 30 seconds between heartbeat logs
SLOW_OPERATION_THRESHOLD_MS=10000         # 10 seconds to flag slow operations
```

### Default Values

If environment variables are not set, the system uses these defaults:

| Operation | Default Timeout | Max Timeout |
|-----------|----------------|-------------|
| Transcription | 30 minutes | 1 hour |
| Analysis | 45 minutes | 1 hour |
| Custom Analysis | 45 minutes | 1 hour |
| Gemini API | 45 minutes | 1 hour |
| Long Running | 1 hour | 3 hours |

## Timeout Mechanisms

### 1. Adaptive Timeout

Automatically extends timeouts based on operation progress:

```typescript
// Starts with base timeout, extends up to max timeout
AdaptiveTimeout.createExtendableTimeout(
  promise,
  baseTimeout,    // Initial timeout
  maxTimeout,     // Maximum allowed timeout
  operationName,
  onProgress      // Progress callback
);
```

### 2. Progressive Timeout

Provides regular progress updates during long operations:

```typescript
// Logs progress every 30 seconds
AdaptiveTimeout.createProgressiveTimeout(
  promise,
  timeout,
  operationName,
  30000  // Progress interval
);
```

### 3. Circuit Breaker

Prevents repeated failures from overwhelming the system:

- **Closed**: Normal operation
- **Open**: Rejecting calls after 5 failures
- **Half-Open**: Testing recovery after 5 minutes

## Monitoring and Logging

### Progress Logging

The system provides detailed progress logging:

```
[ProgressiveTimeout] Transcription progress: 120000ms elapsed (13%)
[AdaptiveTimeout] Extending timeout for Analysis: 900000ms elapsed, next timeout: 1800000ms
[CircuitBreaker] Gemini API - State changed to HALF_OPEN
```

### Error Categorization

Errors are categorized for better debugging:

- **TIMEOUT**: Operation exceeded maximum time
- **QUOTA**: API rate limits exceeded
- **AUTH**: Authentication/authorization errors
- **SERVICE**: Gemini service unavailable
- **UNKNOWN**: Uncategorized errors

### Production Monitoring

Enhanced production logging includes:

```json
{
  "type": "OPERATION_TIMEOUT",
  "operation": "Transcription",
  "elapsed": 1800000,
  "maxTimeout": 3600000,
  "circuitBreakerState": "CLOSED",
  "timestamp": "2025-07-06T15:38:10.544Z"
}
```

## Best Practices

### 1. For Development

- Use shorter timeouts for faster feedback
- Enable debug logging for detailed operation tracking

```bash
TRANSCRIPTION_TIMEOUT_MS=600000  # 10 minutes
LOG_LEVEL=debug
```

### 2. For Production

- Use extended timeouts for reliability
- Enable production monitoring

```bash
TRANSCRIPTION_TIMEOUT_MS=1800000  # 30 minutes
ANALYSIS_TIMEOUT_MS=2700000       # 45 minutes
NODE_ENV=production
```

### 3. For High-Volume Environments

- Increase API key count for rate limit distribution
- Monitor circuit breaker state
- Use background processing for long operations

## Troubleshooting

### Common Issues

1. **Still Getting Timeouts**
   - Increase `LONG_RUNNING_TIMEOUT_MS`
   - Check circuit breaker state
   - Verify API key limits

2. **Operations Taking Too Long**
   - Check Gemini API status
   - Verify network connectivity
   - Monitor rate limits

3. **Circuit Breaker Always Open**
   - Check API key validity
   - Verify service availability
   - Review error logs

### Debug Commands

```bash
# Check current timeout configuration
curl -X GET /api/analyze | jq '.config.timeouts'

# Monitor circuit breaker state
curl -X GET /api/health | jq '.circuitBreaker'
```

## Implementation Details

### Files Modified

1. **`src/lib/logging-config.ts`** - Extended timeout configurations
2. **`src/lib/utils.ts`** - Adaptive timeout classes and circuit breaker
3. **`src/lib/gemini.ts`** - Enhanced retry logic with circuit breaker
4. **`src/app/api/analyze/route.ts`** - Updated timeout mechanisms

### Key Features

- **Extendable Timeouts**: Double timeout on progress up to maximum
- **Circuit Breaker**: Fail fast after repeated failures
- **Progress Monitoring**: Regular status updates
- **Error Categorization**: Better debugging and monitoring
- **Production Logging**: Structured logs for monitoring

## Migration Notes

### Existing Installations

The new timeout system is backward compatible:

1. Existing environment variables still work
2. Default timeouts are extended but can be overridden
3. New logging is additive, doesn't break existing logs

### Upgrading

1. Update environment variables for production
2. Monitor logs for timeout patterns
3. Adjust timeouts based on actual operation durations
4. Set up alerting for circuit breaker state changes

---

**Note**: This configuration is designed to handle operations up to 30 minutes as mentioned in your requirements. For even longer operations, increase the `LONG_RUNNING_TIMEOUT_MS` value accordingly.
