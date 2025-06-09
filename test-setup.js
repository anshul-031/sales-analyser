#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkFileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

function checkEnvVariable(varName) {
  const value = process.env[varName];
  return value && value !== 'your_api_key_here' && value !== 'your-secret-here' && !value.includes('placeholder');
}

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (checkFileExists(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
}

async function testSetup() {
  console.log('🔍 Sales Analyzer Setup Test\n');
  
  // Load environment variables
  loadEnvFile();
  
  // Required files for file-based system
  const requiredFiles = [
    'package.json',
    'src/app/page.tsx',
    'src/lib/gemini.ts',
    'src/lib/utils.ts',
    'src/lib/file-storage.ts',
    'src/app/api/upload/route.ts',
    'src/app/api/analyze/route.ts',
    'src/components/FileUpload.tsx',
    'src/components/AnalysisConfig.tsx',
    'src/components/AnalysisResults.tsx',
    '.env',
    'README.md'
  ];

  console.log('📁 Checking required files...');
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    if (checkFileExists(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file}`);
      allFilesExist = false;
    }
  }

  // Check environment configuration
  console.log('\n🔧 Checking environment configuration...');
  const envChecks = [
    'GOOGLE_GEMINI_API_KEY',
    'NEXTAUTH_SECRET',
    'MAX_FILE_SIZE',
    'UPLOAD_DIR'
  ];

  let envConfigured = true;
  for (const envVar of envChecks) {
    if (checkEnvVariable(envVar)) {
      console.log(`✅ ${envVar} configured`);
    } else {
      console.log(`⚠️  ${envVar} not configured (using default or placeholder)`);
      if (envVar === 'GOOGLE_GEMINI_API_KEY') {
        envConfigured = false;
      }
    }
  }

  // Check package.json dependencies
  console.log('\n📦 Checking package.json dependencies...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@google/generative-ai',
      'react-dropzone',
      'lucide-react',
      'tailwindcss',
      'typescript'
    ];

    let depsOk = true;
    for (const dep of requiredDeps) {
      const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
      if (version) {
        console.log(`✅ ${dep} (${version})`);
      } else {
        console.log(`❌ ${dep}`);
        depsOk = false;
      }
    }
  } catch (error) {
    console.log('❌ Error reading package.json');
  }

  // Check upload directory
  console.log('\n📂 Checking file storage setup...');
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const dataDir = './data';
  
  if (!checkFileExists(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created upload directory: ${uploadDir}`);
    } catch (error) {
      console.log(`❌ Cannot create upload directory: ${uploadDir}`);
    }
  } else {
    console.log(`✅ Upload directory exists: ${uploadDir}`);
  }

  if (!checkFileExists(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`✅ Created data directory: ${dataDir}`);
    } catch (error) {
      console.log(`❌ Cannot create data directory: ${dataDir}`);
    }
  } else {
    console.log(`✅ Data directory exists: ${dataDir}`);
  }

  // Summary
  console.log('\n📋 Setup Summary:');
  if (allFilesExist) {
    console.log('✅ All required files are present');
  } else {
    console.log('❌ Some required files are missing');
  }

  console.log('\n🚀 Next Steps:');
  if (!envConfigured) {
    console.log('1. ⚠️  Update .env file with your Google Gemini API key');
    console.log('   Get your API key from: https://aistudio.google.com/app/apikey');
  } else {
    console.log('1. ✅ Environment is configured');
  }
  
  console.log('2. Run "npm install" to install dependencies');
  console.log('3. Run "npm run dev" to start the development server');
  console.log('4. Open http://localhost:3000 in your browser');

  console.log('\n📖 For detailed instructions, see README.md');
  console.log('🔗 API testing: Import postman/Sales_Analyzer_API.postman_collection.json');
  console.log('🧪 Test file storage: Run "node test-file-system.js"');
  
  console.log('\n🎉 File-based system ready - no database required!');
}

// Run the test
testSetup().catch(error => {
  console.error('❌ Setup test failed:', error);
  process.exit(1);
});