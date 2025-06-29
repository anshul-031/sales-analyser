import { DatabaseStorage, connectToDatabase, disconnectFromDatabase } from './db';
import { Logger } from './utils';

async function main() {
  Logger.info('[Seed] Starting database seeding...');

  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create a test user if needed
    const testUserId = 'test-user-1';
    await DatabaseStorage.createUser(testUserId);
    Logger.info('[Seed] Created test user:', testUserId);

    // You can add more seed data here as needed
    // For example, creating sample uploads, analyses, etc.

    Logger.info('[Seed] Database seeding completed successfully');

  } catch (error) {
    Logger.error('[Seed] Database seeding failed:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

main().catch((error) => {
  Logger.error('[Seed] Unexpected error:', error);
  process.exit(1);
});
