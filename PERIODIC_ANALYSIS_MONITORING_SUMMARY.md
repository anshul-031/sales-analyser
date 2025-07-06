# Periodic Analysis Monitoring Enhancement

## Overview
Implemented a comprehensive periodic monitoring system that tracks all in-progress call analyses and logs their status every minute. This enhancement provides real-time visibility into the analysis pipeline and helps identify stuck or slow analyses.

## Key Features

### 1. **Analysis Monitor Service** (`/src/lib/analysis-monitor.ts`)
- **Singleton Pattern**: Global instance that tracks all analyses across the application
- **Periodic Logging**: Logs status every minute (configurable)
- **Stage Tracking**: Monitors analyses through stages: PENDING → PROCESSING → TRANSCRIBING → ANALYZING → COMPLETED/FAILED
- **Real-time Updates**: Tracks elapsed time and time since last update for each analysis
- **Automatic Cleanup**: Removes stale analyses from tracking

### 2. **Enhanced Logging System**
- **Specialized Monitor Logs**: New `Logger.monitor()` method for better monitoring visibility
- **Production Logging**: All monitoring logs are visible in production environments
- **Structured Logging**: JSON format for easy parsing and analysis
- **Stage Distribution**: Summary statistics of analyses by stage

### 3. **Proactive Alerting**
- **Stuck Analysis Detection**: Warns when analysis hasn't updated for > 5 minutes (configurable)
- **Long-running Analysis Alerts**: Alerts for analyses running > 15 minutes (configurable)
- **Stale Analysis Cleanup**: Removes analyses that haven't updated for > 30 minutes

## Implementation Details

### Configuration (`.env`)
```properties
# Analysis Monitoring Configuration
ANALYSIS_MONITOR_INTERVAL_MS=60000          # 1 minute monitoring interval
STUCK_ANALYSIS_THRESHOLD_MS=300000          # 5 minutes threshold for stuck analyses
LONG_RUNNING_ANALYSIS_THRESHOLD_MS=900000   # 15 minutes threshold for long-running analyses
STALE_ANALYSIS_THRESHOLD_MS=1800000         # 30 minutes threshold for stale analyses
```

### Monitoring Stages
1. **PENDING**: Analysis created but not yet started
2. **PROCESSING**: Analysis started, preparing for transcription
3. **TRANSCRIBING**: Audio transcription in progress
4. **ANALYZING**: AI analysis in progress
5. **COMPLETED**: Analysis finished successfully
6. **FAILED**: Analysis failed with error

### Log Output Example
```
[INFO] [PROD] 2025-01-07T10:30:00.000Z - [MONITOR] 3 analyses in progress:
[INFO] [PROD] 2025-01-07T10:30:00.000Z - [MONITOR] [1/3] analysis_123: {
  "filename": "sales_call_1.mp3",
  "stage": "TRANSCRIBING",
  "elapsedTime": "45s",
  "timeSinceUpdate": "10s",
  "analysisType": "DEFAULT",
  "userId": "user_456",
  "requestId": "req_789"
}
[INFO] [PROD] 2025-01-07T10:30:00.000Z - [MONITOR] Stage distribution: {
  "TRANSCRIBING": 1,
  "ANALYZING": 2
}
```

## Integration Points

### 1. **Analysis API Route** (`/src/app/api/analyze/route.ts`)
- Registers new analyses for monitoring
- Updates analysis stages during processing
- Completes analysis tracking on success/failure

### 2. **Database Integration** (`/src/lib/db.ts`)
- Added `getAnalysesByStatus()` method for database synchronization
- Monitors analyses in PENDING and PROCESSING states

### 3. **Monitoring API** (`/src/app/api/monitoring/analysis/route.ts`)
- New endpoint to get current monitoring statistics
- Provides real-time view of analysis pipeline health

## Benefits

### 1. **Operational Visibility**
- Real-time insight into analysis pipeline health
- Easy identification of bottlenecks and issues
- Historical tracking of analysis performance

### 2. **Proactive Issue Detection**
- Early warning system for stuck analyses
- Automatic detection of performance degradation
- Alerts for abnormal processing times

### 3. **Production Monitoring**
- Comprehensive logging in production environments
- Structured logs for monitoring tools integration
- Performance metrics for optimization

### 4. **Debugging Support**
- Detailed stage-by-stage tracking
- Request ID correlation for troubleshooting
- Elapsed time tracking for performance analysis

## Monitoring Dashboard Data
The monitoring system provides:
- **Total analyses in progress**
- **Distribution by stage**
- **Longest running analysis details**
- **Stuck analysis alerts**
- **Performance metrics**

## Usage

### Automatic Monitoring
The monitoring system starts automatically in production:
```typescript
// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  analysisMonitor.startMonitoring();
}
```

### Manual Monitoring Control
```typescript
import { analysisMonitor } from '@/lib/analysis-monitor';

// Start monitoring
analysisMonitor.startMonitoring();

// Stop monitoring
analysisMonitor.stopMonitoring();

// Get current stats
const stats = analysisMonitor.getMonitoringStats();
```

### API Monitoring
```bash
# Get current monitoring statistics
GET /api/monitoring/analysis
Authorization: Bearer <token>
```

## Files Modified/Created

### New Files
- `/src/lib/analysis-monitor.ts` - Main monitoring service
- `/src/app/api/monitoring/analysis/route.ts` - Monitoring API endpoint
- `PERIODIC_ANALYSIS_MONITORING_SUMMARY.md` - This documentation

### Modified Files
- `/src/lib/logging-config.ts` - Added monitoring configuration
- `/src/lib/utils.ts` - Added specialized monitor logging method
- `/src/lib/db.ts` - Added getAnalysesByStatus method
- `/src/app/api/analyze/route.ts` - Integrated monitoring tracking
- `.env` - Added monitoring environment variables

## Performance Impact
- **Minimal**: Monitoring runs every minute with lightweight operations
- **Memory**: Tracks only active analyses (auto-cleanup of completed ones)
- **CPU**: Negligible impact from periodic logging and database sync

## Future Enhancements
- Integration with external monitoring services (Datadog, New Relic)
- Web dashboard for real-time monitoring visualization
- Email/Slack alerts for critical issues
- Historical analysis performance tracking
- Automated analysis retry mechanisms

This enhancement provides comprehensive visibility into the analysis pipeline, enabling proactive monitoring and quick issue resolution in production environments.
