import { prisma, connectToDatabase, disconnectFromDatabase } from './db';
import { Logger } from './utils';

async function debugDatabase() {
  Logger.info('[Debug] Starting database debug session...');

  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Check all tables for data
    const users = await prisma.user.findMany();
    const uploads = await prisma.upload.findMany();
    const analyses = await prisma.analysis.findMany();
    const insights = await prisma.analysisInsight.findMany();
    const metrics = await prisma.callMetrics.findMany();

    // Helper function to serialize BigInt for JSON
    const serializeData = (data: any) => {
      return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    };

    console.log('\n=== DATABASE DEBUG REPORT ===');
    console.log(`Users: ${users.length}`);
    console.log('Users data:', JSON.stringify(serializeData(users), null, 2));
    
    console.log(`\nUploads: ${uploads.length}`);
    console.log('Uploads data:', JSON.stringify(serializeData(uploads), null, 2));
    
    console.log(`\nAnalyses: ${analyses.length}`);
    console.log('Analyses data:', JSON.stringify(serializeData(analyses), null, 2));
    
    console.log(`\nInsights: ${insights.length}`);
    console.log('Insights data:', JSON.stringify(serializeData(insights), null, 2));
    
    console.log(`\nCall Metrics: ${metrics.length}`);
    console.log('Metrics data:', JSON.stringify(serializeData(metrics), null, 2));

    // Test a specific user
    console.log('\n=== TESTING USER: demo-user-001 ===');
    const testUser = 'demo-user-001';
    
    const userUploads = await prisma.upload.findMany({
      where: { userId: testUser },
      include: {
        analyses: {
          include: {
            insights: true,
            callMetrics: true,
          }
        }
      }
    });
    
    console.log(`User uploads: ${userUploads.length}`);
    console.log('User uploads data:', JSON.stringify(serializeData(userUploads), null, 2));

    Logger.info('[Debug] Database debug completed successfully');

  } catch (error) {
    Logger.error('[Debug] Database debug failed:', error);
    console.error('Error details:', error);
  } finally {
    await disconnectFromDatabase();
  }
}

debugDatabase().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
