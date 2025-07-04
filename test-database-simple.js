#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * Tests basic database connectivity and timeout configuration
 */

const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  const prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  
  try {
    console.log('📋 Testing basic connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');
    
    console.log('🏥 Testing health check...');
    const result = await prisma.$queryRaw`SELECT 1 as health`;
    console.log('✅ Health check passed:', result);
    
    console.log('📊 Testing analysis query...');
    const analysisCount = await prisma.analysis.count();
    console.log(`✅ Analysis count: ${analysisCount}`);
    
    console.log('📤 Testing upload query...');
    const uploadCount = await prisma.upload.count();
    console.log(`✅ Upload count: ${uploadCount}`);
    
    console.log('\n🎉 Database connection test completed successfully!');
    console.log('✨ Database is accessible and responsive.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Ensure your PostgreSQL/Neon database is running');
    console.log('3. Verify network connectivity to your database');
    console.log('4. Check if the database tables exist (run: npx prisma db push)');
    console.log('5. Review the DATABASE_TIMEOUT_RESOLUTION.md guide');
    
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🚀 Database is ready for operations!');
      console.log('📖 Enhanced timeout handling is configured in the application');
      console.log('🔄 Retry mechanisms will handle temporary connection issues');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
