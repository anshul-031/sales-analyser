# Deployment and Monitoring Guide for Long-Running Analysis

## Quick Start

### 1. Environment Variables

Add these to your production `.env` file:

```bash
# Extended timeout configurations (milliseconds)
TRANSCRIPTION_TIMEOUT_MS=1800000          # 30 minutes
ANALYSIS_TIMEOUT_MS=2700000               # 45 minutes
CUSTOM_ANALYSIS_TIMEOUT_MS=2700000        # 45 minutes
GEMINI_API_TIMEOUT_MS=2700000             # 45 minutes
LONG_RUNNING_TIMEOUT_MS=3600000           # 1 hour
BACKGROUND_PROCESSING_TIMEOUT_MS=3600000  # 1 hour

# Progress monitoring
HEARTBEAT_INTERVAL_MS=30000               # 30 seconds
```

### 2. Verify Configuration

Check that your configuration is loaded correctly:

```bash
# Test health endpoint
curl -X GET https://your-domain.com/api/health | jq '.timeouts'

# Expected output:
{
  "transcription": 1800000,
  "analysis": 2700000,
  "customAnalysis": 2700000,
  "geminiApi": 2700000,
  "longRunning": 3600000,
  "backgroundProcessing": 3600000,
  "heartbeatInterval": 30000
}
```

### 3. Deploy

Deploy your application with the new configuration:

```bash
# Build and deploy
npm run build
npm start

# Or on Vercel
vercel --prod
```

## Monitoring

### 1. Key Metrics to Track

Monitor these metrics in your logs:

```bash
# Operations requiring timeout extensions
grep "Extending timeout" /var/log/app.log

# Circuit breaker state changes
grep "Circuit.*State changed" /var/log/app.log

# Progress updates during long operations
grep "progress:" /var/log/app.log

# Error categorization
grep "CATEGORIZED_ERROR" /var/log/app.log
```

### 2. Set Up Alerts

Configure alerts for these conditions:

```bash
# Circuit breaker open for >10 minutes
grep "State changed to OPEN" /var/log/app.log

# >50% operations requiring timeout extensions
grep "Extending timeout" /var/log/app.log | wc -l

# High error rate
grep "PRODUCTION-ERROR" /var/log/app.log | wc -l
```

### 3. Dashboard Queries

For monitoring systems like Grafana/DataDog:

```sql
-- Average operation duration
SELECT AVG(duration) FROM logs WHERE message LIKE '%completed in%'

-- Timeout extension frequency
SELECT COUNT(*) FROM logs WHERE message LIKE '%Extending timeout%'

-- Error rate by category
SELECT category, COUNT(*) FROM logs WHERE type = 'CATEGORIZED_ERROR' GROUP BY category
```

## Troubleshooting

### Common Issues

#### 1. Still Getting Timeouts

**Problem**: Operations still timeout despite extended timeouts

**Solution**:
```bash
# Check current timeout values
curl -X GET /api/health | jq '.timeouts'

# Increase maximum timeout
export LONG_RUNNING_TIMEOUT_MS=5400000  # 90 minutes

# Check circuit breaker state
curl -X GET /api/health | jq '.circuitBreaker'
```

#### 2. Circuit Breaker Always Open

**Problem**: Circuit breaker stays open, blocking operations

**Solution**:
```bash
# Check API key validity
curl -X GET /api/health | jq '.geminiConfiguration'

# Verify service availability
curl -X GET "https://generativelanguage.googleapis.com/v1/models"

# Check error logs
grep "Circuit.*OPEN" /var/log/app.log
```

#### 3. Operations Taking Too Long

**Problem**: Operations consistently take >45 minutes

**Solution**:
```bash
# Check network connectivity
ping generativelanguage.googleapis.com

# Verify API key limits
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1/models"

# Monitor rate limits
grep "QUOTA" /var/log/app.log
```

### Debug Commands

```bash
# Check current configuration
./test-timeout-config.sh

# Monitor real-time analysis
tail -f /var/log/app.log | grep -E "(Transcription|Analysis|timeout|Circuit)"

# Check system health
curl -X GET /api/health | jq '.'
```

## Production Optimization

### 1. Scaling for High Volume

For high-volume environments:

```bash
# Increase API key count
export GOOGLE_GEMINI_API_KEYS='["key1", "key2", "key3", "key4", "key5"]'

# Adjust monitoring intervals
export HEARTBEAT_INTERVAL_MS=60000  # 1 minute for less noise

# Optimize database connections
export DATABASE_MAX_CONNECTIONS=20
```

### 2. Resource Monitoring

Monitor system resources:

```bash
# Memory usage
curl -X GET /api/health | jq '.environment.uptime'

# Active analyses
curl -X GET /api/monitoring/analysis | jq '.analyses | length'

# Database performance
grep "Database.*completed" /var/log/app.log
```

### 3. Log Management

Manage log volume:

```bash
# Reduce debug logging in production
export LOG_LEVEL=info

# Rotate logs
logrotate -f /etc/logrotate.d/app

# Archive old logs
find /var/log -name "*.log" -mtime +7 -exec gzip {} \;
```

## Security Considerations

### 1. API Key Management

```bash
# Rotate API keys regularly
export GOOGLE_GEMINI_API_KEYS='["new_key1", "new_key2", "new_key3"]'

# Monitor API key usage
grep "Using API key" /var/log/app.log | sort | uniq -c
```

### 2. Rate Limit Protection

```bash
# Monitor rate limit hits
grep "QUOTA" /var/log/app.log | wc -l

# Check rate limit distribution
grep "Rate limit" /var/log/app.log | grep -o "key [0-9]" | sort | uniq -c
```

## Performance Tuning

### 1. Optimal Timeout Values

Based on your logs showing 30-minute operations:

```bash
# Conservative settings (recommended)
export TRANSCRIPTION_TIMEOUT_MS=1800000  # 30 minutes
export ANALYSIS_TIMEOUT_MS=2700000       # 45 minutes
export LONG_RUNNING_TIMEOUT_MS=3600000   # 1 hour

# Aggressive settings (for faster feedback)
export TRANSCRIPTION_TIMEOUT_MS=900000   # 15 minutes
export ANALYSIS_TIMEOUT_MS=1800000       # 30 minutes
export LONG_RUNNING_TIMEOUT_MS=2700000   # 45 minutes
```

### 2. Memory Management

```bash
# Monitor memory usage
grep "SYSTEM_HEALTH" /var/log/app.log | jq '.memory'

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 3. Database Optimization

```bash
# Monitor database query performance
grep "Database.*completed" /var/log/app.log | grep -o "[0-9]*ms" | sort -n

# Optimize connection pooling
export DATABASE_MAX_CONNECTIONS=15
export DATABASE_CONNECTION_TIMEOUT=60000
```

## Expected Results

After implementing this solution:

### ✅ Success Indicators

- Operations complete within extended timeouts
- Circuit breaker remains closed during normal operation
- Progress logging shows regular updates
- Error rate decreases significantly

### 📊 Performance Metrics

- 95% of operations complete within base timeouts
- <5% require timeout extensions
- Circuit breaker opens <1% of time
- Error rate <2% overall

### 🔍 Monitoring Output

```
[ProgressiveTimeout] Transcription progress: 600000ms elapsed (33%)
[AdaptiveTimeout] Analysis completed in 1247532ms (historical average: 1156234ms)
[CircuitBreaker] Gemini API - State: CLOSED (0 failures)
[PRODUCTION-INFO] Operation completed successfully after 1847ms
```

---

**Note**: This solution is designed to handle your reported 30-minute operations. Monitor the actual performance and adjust timeouts accordingly. The adaptive timeout system will learn from your usage patterns and optimize itself over time.
