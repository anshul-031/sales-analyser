# Automatic File Cleanup Feature

## Overview

The Sales Performance Analyzer now includes **automatic file cleanup** functionality that deletes uploaded audio files after successful analysis completion. This feature helps manage disk space while preserving all analysis data and transcriptions.

## How It Works

### Automatic Cleanup (Default)
When `AUTO_DELETE_FILES=true` (default):

1. **Upload**: Audio file uploaded to `./uploads/` directory
2. **Analysis**: AI transcription and analysis performed
3. **Completion**: Analysis results stored in `./data/analyses.json`
4. **Cleanup**: Original audio file automatically deleted
5. **Preservation**: Analysis data, transcription, and metadata preserved

### Manual Control
When `AUTO_DELETE_FILES=false`:

1. **Upload**: Audio file uploaded and preserved
2. **Analysis**: AI transcription and analysis performed  
3. **Completion**: Analysis results stored, file remains
4. **Manual Cleanup**: Use cleanup API when desired

## Configuration

### Environment Variable
```env
# Enable automatic file deletion after analysis (recommended)
AUTO_DELETE_FILES=true

# Disable automatic deletion (keep all files)
AUTO_DELETE_FILES=false
```

### Default Behavior
- **Default**: `AUTO_DELETE_FILES=true`
- **Rationale**: Audio files can be large (50MB each), analysis data is typically small (few KB)
- **Benefit**: Saves 95%+ storage space while keeping all useful data

## What Gets Deleted vs. Preserved

### ✅ Always Preserved
- **Analysis Results**: Complete AI analysis with scores and recommendations
- **Transcription**: Full text transcription of the audio
- **Metadata**: File information, timestamps, user data
- **Analysis History**: All past analyses for reporting

### 🗑️ Deleted (When Auto-Cleanup Enabled)
- **Original Audio Files**: Large audio files after successful analysis
- **Temporary Files**: Any processing temporary files

### ⚠️ Never Deleted
- **Failed Analysis Files**: Files from failed analyses are preserved for retry
- **Processing Files**: Files currently being analyzed
- **Analysis Data**: JSON data files always preserved

## API Endpoints

### Get Cleanup Status
```bash
GET /api/cleanup?userId=demo-user-001

Response:
{
  "success": true,
  "status": {
    "totalUploads": 5,
    "totalAnalyses": 5,
    "completedAnalyses": 4,
    "filesEligibleForCleanup": 3,
    "autoDeleteEnabled": true
  }
}
```

### Manual Cleanup - Specific File
```bash
DELETE /api/cleanup?uploadId=upload_123&userId=demo-user-001

Response:
{
  "success": true,
  "message": "File deleted successfully",
  "deleted": true
}
```

### Manual Cleanup - All Completed
```bash
DELETE /api/cleanup?userId=demo-user-001

Response:
{
  "success": true,
  "message": "Cleaned up 3 completed analysis files",
  "deletedCount": 3,
  "totalCompleted": 4
}
```

## Use Cases

### Recommended: Auto-Cleanup Enabled
**Best for:**
- Production deployments
- Limited storage environments
- Regular usage patterns
- Cost-conscious deployments

**Benefits:**
- Zero maintenance required
- Optimal storage usage
- All analysis data preserved
- Immediate cleanup after analysis

### Manual Control: Auto-Cleanup Disabled
**Best for:**
- Development environments
- Compliance requirements (keep original files)
- Debugging needs
- Archive requirements

**Benefits:**
- Full control over file retention
- Ability to re-analyze original files
- Compliance with data retention policies
- Debug access to original audio

## Storage Impact

### With Auto-Cleanup (Recommended)
```
Example Analysis Session:
- Audio File: 2MB
- Analysis Data: 5KB
- Storage After Cleanup: 5KB (99.75% savings)
- Functionality: 100% preserved
```

### Without Auto-Cleanup
```
Example Analysis Session:
- Audio File: 2MB (preserved)
- Analysis Data: 5KB
- Total Storage: 2MB
- Re-analysis: Available from original file
```

## Implementation Details

### File Storage Integration
```typescript
// In src/lib/file-storage.ts
static async cleanupCompletedAnalysis(analysisId: string): Promise<void> {
  // Only cleanup completed analyses
  // Delete physical file and remove metadata
  // Log all cleanup actions
}

static async deleteUploadedFile(uploadId: string): Promise<boolean> {
  // Remove physical file
  // Update JSON metadata
  // Return success status
}
```

### Analysis API Integration
```typescript
// In src/app/api/analyze/route.ts
const autoDeleteFiles = process.env.AUTO_DELETE_FILES === 'true';
if (autoDeleteFiles) {
  await FileStorage.cleanupCompletedAnalysis(analysisId);
  Logger.info('[Analyze API] Auto-cleanup enabled - deleted uploaded file');
}
```

## Error Handling

### Graceful Failure
- **File Not Found**: Logged as warning, not error
- **Permission Issues**: Logged with details, operation continues
- **Analysis Preserved**: Cleanup failure never affects analysis data

### Logging
```
[INFO] [FileStorage] Cleaned up file for completed analysis: analysis_123
[WARN] [FileStorage] File already deleted or not found: ./uploads/file.mp3
[ERROR] [FileStorage] Error during cleanup: Permission denied
```

## Security Considerations

### Access Control
- **User Isolation**: Users can only delete their own files
- **Upload Verification**: Ownership verified before deletion
- **Analysis Protection**: Analysis data cannot be deleted via cleanup API

### Audit Trail
- **All Operations Logged**: Complete audit trail of cleanup actions
- **Timestamp Tracking**: When files were deleted
- **User Attribution**: Which user triggered cleanup

## Migration and Rollback

### Enabling Auto-Cleanup on Existing Installation
1. **Update Environment**: Set `AUTO_DELETE_FILES=true`
2. **Restart Application**: Reload environment variables
3. **Manual Cleanup**: Optionally cleanup existing completed analyses
4. **Verification**: Check logs for automatic cleanup on new analyses

### Disabling Auto-Cleanup
1. **Update Environment**: Set `AUTO_DELETE_FILES=false`
2. **Restart Application**: Reload environment variables
3. **Immediate Effect**: New analyses will preserve files
4. **Existing Files**: Already deleted files cannot be recovered

## Monitoring and Maintenance

### Health Checks
- **Storage Usage**: Monitor `./uploads/` directory size
- **Cleanup Success**: Check logs for cleanup failures
- **Analysis Quality**: Verify cleanup doesn't affect analysis results

### Recommended Monitoring
```bash
# Check upload directory size
du -sh ./uploads/

# Check data directory size
du -sh ./data/

# Recent cleanup logs
tail -f logs/application.log | grep "Cleanup"
```

## Best Practices

### Production Deployment
1. **Enable Auto-Cleanup**: Set `AUTO_DELETE_FILES=true`
2. **Monitor Storage**: Set up disk space alerts
3. **Log Monitoring**: Watch for cleanup failures
4. **Backup Analysis Data**: Regular backup of `./data/` directory

### Development Environment
1. **Disable Auto-Cleanup**: Set `AUTO_DELETE_FILES=false` for debugging
2. **Manual Cleanup**: Use cleanup API when storage gets full
3. **Test Both Modes**: Verify cleanup doesn't break functionality

### Backup Strategy
- **Analysis Data**: Regular backup of JSON files (small, important)
- **Audio Files**: Optional backup if compliance requires (large, can regenerate analysis)
- **Configuration**: Backup `.env` and application configuration

## Troubleshooting

### Common Issues

**Files Not Being Deleted**
```bash
# Check environment variable
echo $AUTO_DELETE_FILES

# Check logs for cleanup attempts
grep "cleanup" logs/application.log

# Check file permissions
ls -la ./uploads/
```

**Storage Still Growing**
```bash
# Check for failed analyses (files preserved)
curl "http://localhost:3000/api/cleanup?userId=user_123"

# Manual cleanup of completed analyses
curl -X DELETE "http://localhost:3000/api/cleanup?userId=user_123"
```

**Permission Errors**
```bash
# Fix upload directory permissions
chmod 755 ./uploads/
chmod 644 ./uploads/*
```

## Performance Impact

### Analysis Performance
- **No Impact**: Cleanup happens after analysis completion
- **Background Operation**: Non-blocking file deletion
- **Fast Operation**: File deletion typically <100ms

### Storage Performance
- **Improved**: Less disk usage, better I/O performance
- **Faster Backups**: Smaller data directory
- **Reduced Cleanup**: No manual maintenance required

## Future Enhancements

### Planned Features
- **Retention Policies**: Keep files for X days before deletion
- **Archive Integration**: Move to cloud storage instead of deletion
- **Analytics Dashboard**: Storage usage and cleanup statistics
- **Bulk Operations**: UI for managing multiple files

### Configuration Extensions
```env
# Planned future options
FILE_RETENTION_DAYS=7        # Keep files for 7 days
ARCHIVE_TO_S3=true          # Move to S3 instead of delete
CLEANUP_SCHEDULE=daily      # Scheduled cleanup job
```

## Summary

The automatic file cleanup feature provides:

✅ **Optimal Storage Usage** - Delete large audio files, keep small analysis data
✅ **Zero Maintenance** - Automatic operation with configurable control
✅ **Complete Functionality** - All analysis features preserved
✅ **Audit Trail** - Full logging of all cleanup operations
✅ **Flexible Control** - Enable/disable based on requirements
✅ **API Management** - Programmatic control over file cleanup

This feature significantly reduces storage requirements while maintaining the full functionality and value of the sales performance analysis system.