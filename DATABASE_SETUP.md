# Database Setup Guide

This project now uses PostgreSQL with Prisma for persistent data storage of audio call analysis information.

## Quick Setup

1. **Set up PostgreSQL Database**
   ```bash
   # Option 1: Local PostgreSQL
   createdb sales_analyser
   
   # Option 2: Use Docker
   docker run --name postgres-sales -e POSTGRES_PASSWORD=password -e POSTGRES_DB=sales_analyser -p 5432:5432 -d postgres:15
   
   # Option 3: Use a cloud provider (recommended for production)
   # - Neon (https://neon.tech/)
   # - Supabase (https://supabase.com/)
   # - Railway (https://railway.app/)
   # - PlanetScale (https://planetscale.com/)
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env and set your DATABASE_URL
   ```

3. **Initialize Database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database (for development)
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

4. **Migrate Existing Data (if applicable)**
   ```bash
   npm run db:migrate-data
   ```

## Database Schema

### Tables

#### `users`
- `id` - String (CUID)
- `createdAt` - DateTime
- `updatedAt` - DateTime

#### `uploads`
- `id` - String (CUID)
- `filename` - String
- `originalName` - String  
- `fileSize` - BigInt
- `mimeType` - String
- `fileUrl` - String (R2 storage key)
- `uploadedAt` - DateTime
- `userId` - String (FK to users)

#### `analyses`
- `id` - String (CUID)
- `status` - Enum (PENDING, PROCESSING, COMPLETED, FAILED)
- `analysisType` - Enum (DEFAULT, CUSTOM, PARAMETERS)
- `customPrompt` - String (nullable)
- `customParameters` - JSON (nullable)
- `transcription` - String (nullable)
- `analysisResult` - JSON (nullable)
- `errorMessage` - String (nullable)
- `analysisDuration` - Int (nullable, in milliseconds)
- `createdAt` - DateTime
- `updatedAt` - DateTime
- `userId` - String (FK to users)
- `uploadId` - String (FK to uploads)

#### `analysis_insights`
- `id` - String (CUID)
- `analysisId` - String (FK to analyses)
- `category` - String (e.g., "sentiment", "keywords", "action_items")
- `key` - String (e.g., "overall_sentiment", "key_topics")
- `value` - JSON (flexible insight data)
- `confidence` - Float (nullable)
- `createdAt` - DateTime

#### `call_metrics`
- `id` - String (CUID)
- `analysisId` - String (FK to analyses, unique)
- `duration` - Int (nullable, call duration in seconds)
- `participantCount` - Int (nullable)
- `wordCount` - Int (nullable)
- `sentimentScore` - Float (nullable)
- `energyLevel` - Float (nullable)
- `talkRatio` - JSON (nullable)
- `interruptionCount` - Int (nullable)
- `pauseCount` - Int (nullable)
- `speakingPace` - Float (nullable, words per minute)
- `createdAt` - DateTime

## Advanced Analytics Capabilities

With the new database structure, you can now perform advanced analytics:

### 1. User Analytics
```typescript
const analytics = await DatabaseStorage.getUserAnalyticsData(userId);
// Returns: totalUploads, totalAnalyses, completedAnalyses, failedAnalyses, successRate, recentAnalyses
```

### 2. Insight Queries
```typescript
// Get all sentiment insights for a user
const sentimentInsights = await prisma.analysisInsight.findMany({
  where: {
    analysis: { userId },
    category: 'sentiment'
  },
  include: { analysis: { include: { upload: true } } }
});
```

### 3. Call Metrics Analysis
```typescript
// Get average call metrics for a user
const avgMetrics = await prisma.callMetrics.aggregate({
  where: { analysis: { userId } },
  _avg: {
    duration: true,
    sentimentScore: true,
    energyLevel: true,
    speakingPace: true
  }
});
```

### 4. Trend Analysis
```typescript
// Get analysis trends over time
const trends = await prisma.analysis.groupBy({
  by: ['createdAt'],
  where: { 
    userId,
    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  },
  _count: { id: true }
});
```

## Available NPM Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Run database migrations (production)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with initial data
- `npm run db:migrate-data` - Migrate from file-based storage to database

## Environment Variables

```env
# PostgreSQL Database URL
DATABASE_URL="postgresql://username:password@host:port/database_name"

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_BUCKET_NAME="your_bucket_name"

# Google Gemini API
GOOGLE_GEMINI_API_KEYS=["key1", "key2", "key3"]

# Optional settings
MAX_FILE_SIZE="104857600"  # 100MB
AUTO_DELETE_FILES="false"
```

## Production Considerations

1. **Database Hosting**: Use a managed PostgreSQL service for production
2. **Connection Pooling**: Consider using a connection pooler like PgBouncer
3. **Backups**: Set up automated database backups
4. **Monitoring**: Monitor database performance and query analytics
5. **Migrations**: Always use migrations in production, never `db:push`

## Troubleshooting

### Common Issues

1. **Connection Error**: Check your DATABASE_URL format and database availability
2. **Migration Issues**: Reset database with `npx prisma migrate reset` (development only)
3. **Type Issues**: Run `npm run db:generate` after schema changes
4. **Seed Errors**: Check database permissions and connection

### Useful Commands

```bash
# Reset database (development only)
npx prisma migrate reset

# View database with GUI
npm run db:studio

# Check database connection
npx prisma db pull

# Format schema file
npx prisma format
```

## Next Steps

1. Set up your PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Migrate existing data (if applicable)
5. Start building advanced analytics features!

The database is now ready to support comprehensive audio call analysis with structured insights, metrics, and advanced querying capabilities.
