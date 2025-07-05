#!/usr/bin/env node

// Test script to verify the upload redirection fix
const mockResults = [
  // Simulate what the API returns
  {
    success: true,
    results: [
      { uploadId: 'test-upload-1', id: 'test-upload-1' }
    ],
    analyses: [
      { id: 'analysis-1' }
    ]
  },
  // Simulate what the FileUpload component expects
  {
    success: true,
    uploadId: 'test-upload-2',
    analysisId: 'analysis-2'
  }
];

console.log('Testing upload ID extraction logic...');

mockResults.forEach((completeResult, index) => {
  console.log(`\nTest ${index + 1}:`);
  console.log('Input:', JSON.stringify(completeResult, null, 2));
  
  // This is the logic we implemented
  const uploadId = completeResult.results?.[0]?.uploadId || completeResult.uploadId;
  const analysisId = completeResult.analyses?.[0]?.id || completeResult.analysisId;
  
  console.log('Extracted uploadId:', uploadId);
  console.log('Extracted analysisId:', analysisId);
  
  // Simulate the filtering logic
  const result = { success: true, uploadId: uploadId, analysisId: analysisId };
  const hasValidId = result.success && result.uploadId;
  console.log('Would pass filter:', hasValidId);
});

console.log('\n✅ Upload ID extraction test completed');
