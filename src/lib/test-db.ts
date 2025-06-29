import { DatabaseStorage, connectToDatabase, disconnectFromDatabase } from './db';
import { Logger } from './utils';

async function testDatabaseConnection() {
  Logger.info('[DB Test] Starting database connection test...');

  try {
    // Test connection
    const connected = await connectToDatabase();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    Logger.info('[DB Test] Database connection successful');

    // Test basic operations
    const testUserId = 'test-user-' + Date.now();
    
    // Create a test user
    const user = await DatabaseStorage.createUser(testUserId);
    Logger.info('[DB Test] Created test user:', user.id);

    // Create a test upload
    const upload = await DatabaseStorage.createUpload({
      filename: 'test-audio.mp3',
      originalName: 'test-audio.mp3',
      fileSize: 1024,
      mimeType: 'audio/mpeg',
      fileUrl: 'test/path/test-audio.mp3',
      userId: testUserId,
    });
    Logger.info('[DB Test] Created test upload:', upload.id);

    // Create a test analysis
    const analysis = await DatabaseStorage.createAnalysis({
      status: 'PENDING',
      analysisType: 'DEFAULT',
      userId: testUserId,
      uploadId: upload.id,
    });
    Logger.info('[DB Test] Created test analysis:', analysis.id);

    // Update the analysis
    const updatedAnalysis = await DatabaseStorage.updateAnalysis(analysis.id, {
      status: 'COMPLETED',
      transcription: 'This is a test transcription',
      analysisResult: { summary: 'Test summary', sentiment: 'positive' },
      analysisDuration: 5000,
    });
    Logger.info('[DB Test] Updated test analysis:', updatedAnalysis?.id);

    // Create test insights
    await DatabaseStorage.createMultipleInsights([
      {
        analysisId: analysis.id,
        category: 'sentiment',
        key: 'overall_sentiment',
        value: 'positive',
        confidence: 0.95,
      },
      {
        analysisId: analysis.id,
        category: 'summary',
        key: 'call_summary',
        value: 'This was a successful test call',
      },
    ]);
    Logger.info('[DB Test] Created test insights');

    // Test queries
    const userAnalytics = await DatabaseStorage.getUserAnalyticsData(testUserId);
    Logger.info('[DB Test] User analytics:', userAnalytics);

    const globalStats = await DatabaseStorage.getGlobalStats();
    Logger.info('[DB Test] Global stats:', globalStats);

    Logger.info('[DB Test] All database operations completed successfully!');

    // Clean up test data
    await DatabaseStorage.clearUserData(testUserId);
    Logger.info('[DB Test] Cleaned up test data');

  } catch (error) {
    Logger.error('[DB Test] Database test failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('✅ Database test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  });
