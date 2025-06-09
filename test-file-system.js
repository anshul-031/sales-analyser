#!/usr/bin/env node

const { FileStorage } = require('./src/lib/file-storage');

async function testFileSystem() {
  console.log('🔍 Testing File-Based Storage System...\n');
  
  try {
    // Test 1: Create a test upload
    console.log('📁 Testing upload creation...');
    const upload = await FileStorage.createUpload({
      filename: 'test-call.mp3',
      originalName: 'Sample Sales Call.mp3',
      fileSize: 1024000,
      mimeType: 'audio/mpeg',
      fileUrl: './uploads/test-call.mp3',
      userId: 'test-user-123',
    });
    console.log('✅ Upload created:', upload.id);

    // Test 2: Get uploads for user
    console.log('\n📋 Testing upload retrieval...');
    const uploads = await FileStorage.getUploadsByUser('test-user-123');
    console.log('✅ Found', uploads.length, 'uploads for user');

    // Test 3: Create analysis
    console.log('\n🔬 Testing analysis creation...');
    const analysis = await FileStorage.createAnalysis({
      status: 'PENDING',
      analysisType: 'default',
      userId: 'test-user-123',
      uploadId: upload.id,
    });
    console.log('✅ Analysis created:', analysis.id);

    // Test 4: Update analysis
    console.log('\n📝 Testing analysis update...');
    const updatedAnalysis = await FileStorage.updateAnalysis(analysis.id, {
      status: 'COMPLETED',
      transcription: 'This is a test transcription of the sales call...',
      analysisResult: {
        overall_score: 8,
        summary: 'Good sales call performance'
      }
    });
    console.log('✅ Analysis updated successfully');

    // Test 5: Get uploads with analyses
    console.log('\n🔗 Testing uploads with analysis data...');
    const uploadsWithAnalyses = await FileStorage.getUploadsWithAnalyses('test-user-123');
    console.log('✅ Found', uploadsWithAnalyses.length, 'uploads with analysis data');
    if (uploadsWithAnalyses.length > 0) {
      console.log('   - Has analysis:', uploadsWithAnalyses[0].hasAnalysis);
      console.log('   - Analysis count:', uploadsWithAnalyses[0].analyses.length);
    }

    // Test 6: Get analyses with uploads
    console.log('\n📊 Testing analyses with upload data...');
    const analysesWithUploads = await FileStorage.getAnalysesWithUploads('test-user-123');
    console.log('✅ Found', analysesWithUploads.length, 'analyses with upload data');

    // Test 7: Get statistics
    console.log('\n📈 Testing statistics...');
    const stats = await FileStorage.getStats();
    console.log('✅ System statistics:');
    console.log('   - Total uploads:', stats.totalUploads);
    console.log('   - Total analyses:', stats.totalAnalyses);
    console.log('   - Completed analyses:', stats.completedAnalyses);
    console.log('   - Failed analyses:', stats.failedAnalyses);

    console.log('\n🎉 File-based storage system is working correctly!');
    console.log('✨ The application can now run without a database');
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await FileStorage.clearUserData('test-user-123');
    console.log('✅ Test data cleaned up');
    
    return true;

  } catch (error) {
    console.error('❌ File system test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check that the application has write permissions');
    console.log('2. Ensure the data directory can be created');
    console.log('3. Verify file system access');
    
    return false;
  }
}

// Run the test
testFileSystem()
  .then(success => {
    if (success) {
      console.log('\n🚀 File-based system is ready! You can now:');
      console.log('   • Upload files without database dependencies');
      console.log('   • Run analyses with local file storage');
      console.log('   • Start the application with "npm run dev"');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });