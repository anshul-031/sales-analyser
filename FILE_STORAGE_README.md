# File-Based Storage System

## Overview

The Sales Performance Analyzer now supports **database-optional operation** using a local file-based storage system. This allows you to run the application without setting up PostgreSQL or any external database.

## How It Works

### Data Storage Structure
```
sales-analyser/
├── data/
│   ├── uploads.json     # File upload metadata
│   └── analyses.json    # Analysis results and status
└── uploads/             # Actual audio files
    ├── file1.mp3
    ├── file2.wav
    └── ...
```

### Features

- **Automatic Setup**: Creates data directory and files as needed
- **No Database Required**: Works completely offline
- **Full Functionality**: Supports all features (upload, analysis, results)
- **JSON Storage**: Human-readable data format
- **Concurrent Safe**: Handles multiple operations safely

## File Storage vs Database

| Feature | File Storage | Database |
|---------|-------------|----------|
| Setup Complexity | ✅ None | ❌ Requires PostgreSQL |
| Dependencies | ✅ Zero external deps | ❌ Database server needed |
| Performance | ✅ Fast for small datasets | ✅ Better for large datasets |
| Scalability | ⚠️ Limited | ✅ Highly scalable |
| Backup | ✅ Copy JSON files | ⚠️ Database backups needed |
| Multi-user | ⚠️ Basic support | ✅ Full concurrent support |

## Getting Started

### 1. No Additional Setup Required
The file-based system works out of the box:

```bash
npm run dev
```

### 2. Upload Files
- Drag and drop audio files
- Files stored in `./uploads/` directory
- Metadata stored in `./data/uploads.json`

### 3. Run Analysis
- Default or custom analysis
- Results stored in `./data/analyses.json`
- Background processing with status updates

### 4. View Results
- Rich UI displays all analysis details
- Expandable sections for detailed insights
- Download results as JSON

## Data Structure

### uploads.json
```json
[
  {
    "id": "upload_1699123456789_abc123",
    "filename": "unique_filename.mp3",
    "originalName": "My Sales Call.mp3",
    "fileSize": 1024000,
    "mimeType": "audio/mpeg",
    "fileUrl": "./uploads/unique_filename.mp3",
    "uploadedAt": "2024-01-01T12:00:00.000Z",
    "userId": "demo-user-001"
  }
]
```

### analyses.json
```json
[
  {
    "id": "analysis_1699123456789_def456",
    "status": "COMPLETED",
    "analysisType": "default",
    "transcription": "Thank you for calling...",
    "analysisResult": {
      "type": "default",
      "overallScore": 7,
      "parameters": {
        "communication_skills": {
          "score": 8,
          "summary": "Excellent communication...",
          "strengths": ["Clear articulation", "Professional tone"],
          "improvements": ["More active listening"],
          "specific_examples": ["Example 1", "Example 2"],
          "recommendations": ["Recommendation 1", "Recommendation 2"]
        }
      }
    },
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:05:00.000Z",
    "userId": "demo-user-001",
    "uploadId": "upload_1699123456789_abc123"
  }
]
```

## API Endpoints

All existing API endpoints work with file storage:

### Upload Files
```bash
POST /api/upload
Content-Type: multipart/form-data

# Form data:
# - files: audio files
# - userId: user identifier
```

### Start Analysis
```bash
POST /api/analyze
Content-Type: application/json

{
  "uploadIds": ["upload_123"],
  "analysisType": "default",
  "userId": "demo-user-001"
}
```

### Get Results
```bash
GET /api/analyze?userId=demo-user-001
GET /api/analyze?userId=demo-user-001&analysisId=analysis_123
GET /api/analyze?userId=demo-user-001&uploadId=upload_123
```

## Switching Between Systems

### Use File Storage (Default)
No additional configuration needed. Just run:
```bash
npm run dev
```

### Use Database (Optional)
1. Set up PostgreSQL database
2. Configure `DATABASE_URL` in `.env`
3. Update API routes to use Prisma instead of FileStorage
4. Run database migrations

## Data Migration

### From File Storage to Database
```javascript
// Example migration script
const { FileStorage } = require('./src/lib/file-storage');
const { PrismaClient } = require('@prisma/client');

async function migrate() {
  const uploads = await FileStorage.getUploadsByUser('all');
  const analyses = await FileStorage.getAnalysesByUser('all');
  
  // Insert into database...
}
```

### From Database to File Storage
```javascript
// Export from database to JSON files
async function export() {
  const uploads = await prisma.upload.findMany();
  const analyses = await prisma.analysis.findMany();
  
  // Write to JSON files...
}
```

## Backup and Recovery

### Manual Backup
```bash
# Backup data files
cp -r data/ backup/data-$(date +%Y%m%d)/
cp -r uploads/ backup/uploads-$(date +%Y%m%d)/
```

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/$DATE
cp -r data/ backups/$DATE/
cp -r uploads/ backups/$DATE/
echo "Backup created: backups/$DATE"
```

### Recovery
```bash
# Restore from backup
cp -r backup/data-20240101/* data/
cp -r backup/uploads-20240101/* uploads/
```

## Performance Optimization

### Large Datasets
For better performance with many files:

1. **Pagination**: Implement client-side pagination
2. **Lazy Loading**: Load analysis details on demand
3. **Indexing**: Create lookup maps for faster searches
4. **Compression**: Compress JSON files if needed

### Memory Usage
- JSON files loaded into memory
- Consider database for >1000 files
- Monitor memory usage in production

## Troubleshooting

### Common Issues

**Permission Errors**
```bash
chmod 755 data/
chmod 644 data/*.json
```

**Corrupted JSON Files**
```bash
# Backup and recreate
mv data/uploads.json data/uploads.json.backup
echo "[]" > data/uploads.json
```

**Missing Directories**
The application auto-creates directories, but manual creation:
```bash
mkdir -p data uploads
```

### Debugging

Enable detailed logging:
```javascript
// In file-storage.ts
console.log('[FileStorage] Operation details...');
```

Check file contents:
```bash
# Pretty print JSON
cat data/uploads.json | jq .
cat data/analyses.json | jq .
```

## Production Considerations

### Security
- Validate file uploads
- Sanitize user inputs
- Limit file sizes
- Regular security audits

### Monitoring
- File system usage
- JSON file sizes
- Processing times
- Error rates

### Scaling
- Consider database when reaching limits
- Implement file rotation
- Monitor disk space
- Add data retention policies

## Support

For questions about the file-based system:
1. Check this documentation
2. Review the `FileStorage` class in `src/lib/file-storage.ts`
3. Test with the verification script: `node test-file-system.js`
4. Check logs for detailed error information

The file-based system provides a lightweight, zero-dependency solution perfect for development, testing, and small-scale production deployments.