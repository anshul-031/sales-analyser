// Test script to verify the monitoring system is working
console.log('Testing monitoring system...');

// Check if it's a Next.js environment
console.log('NODE_ENV:', process.env.NODE_ENV);

// Import the monitoring module
const { analysisMonitor } = require('./src/lib/analysis-monitor.ts');

console.log('Analysis monitor imported successfully');

// Start monitoring manually
analysisMonitor.startMonitoring();

console.log('Monitoring started, waiting for logs...');

// Keep the script running
setInterval(() => {
  console.log('Script still running...');
}, 30000);
