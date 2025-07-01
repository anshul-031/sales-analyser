import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  category: string;
  requestBody?: any;
  response?: any;
  security?: boolean;
}

/**
 * @swagger
 * /api/endpoints:
 *   get:
 *     tags: [Documentation]
 *     summary: Get all API endpoints
 *     description: Returns a list of all available API endpoints with their documentation
 *     responses:
 *       200:
 *         description: List of API endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: object
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[ENDPOINTS] Starting endpoint extraction...');
    console.log('[ENDPOINTS] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      PWD: process.cwd(),
      __dirname: typeof __dirname !== 'undefined' ? __dirname : 'undefined'
    });
    
    const endpoints = await extractAPIEndpoints();
    
    console.log('[ENDPOINTS] Extraction completed successfully');
    console.log('[ENDPOINTS] Found endpoints count:', endpoints.length);
    console.log('[ENDPOINTS] Endpoint paths:', endpoints.map(e => `${e.method} ${e.path}`));
    
    return NextResponse.json({
      success: true,
      endpoints,
      lastUpdated: new Date().toISOString(),
      debug: {
        totalEndpoints: endpoints.length,
        environment: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL
      }
    });
  } catch (error) {
    console.error('[ENDPOINTS] Error extracting API endpoints:', error);
    console.error('[ENDPOINTS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract API endpoints',
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          environment: process.env.NODE_ENV,
          isVercel: !!process.env.VERCEL
        }
      },
      { status: 500 }
    );
  }
}

async function extractAPIEndpoints(): Promise<APIEndpoint[]> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = !!process.env.VERCEL;
  
  console.log('[ENDPOINTS] Extraction environment:', { isProduction, isVercel });
  
  // Multiple potential paths to check
  const potentialPaths = [
    // Development path
    path.join(process.cwd(), 'src', 'app', 'api'),
    // Vercel production paths (most common)
    path.join(process.cwd(), '.next/server/app/api'),
    path.join(process.cwd(), '.next/server/src/app/api'),
    // Alternative Next.js build paths
    path.join(process.cwd(), 'dist/app/api'),
    path.join(process.cwd(), 'build/app/api'),
    // Vercel serverless function paths
    '/var/task/.next/server/app/api',
    '/var/task/src/app/api',
    '/var/task/app/api',
    // Other potential paths
    path.join(process.cwd(), 'app/api'),
    path.join(process.cwd(), 'pages/api'), // Pages router fallback
  ];
  
  // Add current directory-based search as fallback
  const currentDir = __dirname || process.cwd();
  potentialPaths.push(
    path.join(currentDir, 'api'),
    path.join(currentDir, '..', 'api'),
    path.join(currentDir, '..', '..', 'api'),
    path.join(currentDir, '..', '..', '..', 'api')
  );
  
  let apiPath = '';
  let pathExists = false;
  
  // Find the first existing path
  for (const testPath of potentialPaths) {
    try {
      if (fs.existsSync(testPath)) {
        apiPath = testPath;
        pathExists = true;
        console.log('[ENDPOINTS] Found API path:', apiPath);
        break;
      } else {
        console.log('[ENDPOINTS] Path does not exist:', testPath);
      }
    } catch (error) {
      console.log('[ENDPOINTS] Error checking path:', testPath, error);
    }
  }
  
  if (!pathExists) {
    console.error('[ENDPOINTS] No valid API path found. Checked paths:', potentialPaths);
    // Fallback: try to scan from current working directory
    apiPath = process.cwd();
    console.log('[ENDPOINTS] Using fallback path:', apiPath);
  }
  
  const endpoints: APIEndpoint[] = [];

  console.log('[ENDPOINTS] Starting recursive search in:', apiPath);
  
  // Recursively find all route.ts or route.js files
  const routeFiles = await findRouteFiles(apiPath);
  
  console.log('[ENDPOINTS] Found route files:', routeFiles.length);
  console.log('[ENDPOINTS] Route file paths:', routeFiles);
  
  for (const filePath of routeFiles) {
    try {
      console.log('[ENDPOINTS] Processing file:', filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const endpoint = parseRouteFile(content, filePath);
      if (endpoint) {
        console.log('[ENDPOINTS] Parsed endpoint:', `${endpoint.method} ${endpoint.path}`);
        endpoints.push(endpoint);
      } else {
        console.log('[ENDPOINTS] No endpoint found in:', filePath);
      }
    } catch (error) {
      console.error(`[ENDPOINTS] Error parsing route file ${filePath}:`, error);
    }
  }

  console.log('[ENDPOINTS] Total endpoints extracted:', endpoints.length);
  
  // If no endpoints found, use fallback list of known endpoints
  if (endpoints.length === 0) {
    console.warn('[ENDPOINTS] No endpoints found via file scanning, using fallback list');
    return getFallbackEndpoints();
  }
  
  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}

async function findRouteFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('[ENDPOINTS] Scanning directory:', dir);
  console.log('[ENDPOINTS] Looking for:', isProduction ? 'route.js files' : 'route.ts files');
  
  try {
    if (!fs.existsSync(dir)) {
      console.log('[ENDPOINTS] Directory does not exist:', dir);
      return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    console.log('[ENDPOINTS] Directory entries count:', entries.length);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      console.log('[ENDPOINTS] Processing entry:', entry.name, 'isDirectory:', entry.isDirectory());
      
      if (entry.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
          console.log('[ENDPOINTS] Skipping directory:', entry.name);
          continue;
        }
        
        // Recursively search subdirectories
        console.log('[ENDPOINTS] Recursively scanning:', fullPath);
        const subFiles = await findRouteFiles(fullPath);
        files.push(...subFiles);
      } else {
        // Check for route files - support both .ts and .js in all environments
        const isRouteFile = entry.name === 'route.ts' || entry.name === 'route.js';
        if (isRouteFile) {
          console.log('[ENDPOINTS] Found route file:', fullPath);
          files.push(fullPath);
        } else {
          console.log('[ENDPOINTS] Skipping non-route file:', entry.name);
        }
      }
    }
  } catch (error) {
    console.error(`[ENDPOINTS] Cannot read directory ${dir}:`, error);
    console.error('[ENDPOINTS] Directory read error details:', {
      code: (error as any).code,
      errno: (error as any).errno,
      path: (error as any).path
    });
  }
  
  console.log('[ENDPOINTS] Found total route files in', dir, ':', files.length);
  return files;
}

function parseRouteFile(content: string, filePath: string): APIEndpoint | null {
  console.log('[ENDPOINTS] Parsing route file:', filePath);
  
  const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
  console.log('[ENDPOINTS] Relative path:', relativePath);
  
  // Extract the API path from file path - handle multiple possible structures
  let apiPath = relativePath;
  
  // Remove common prefixes and suffixes
  const patterns = [
    /.*\/src\/app\/api(.*)\/route\.(ts|js)$/,
    /.*\/app\/api(.*)\/route\.(ts|js)$/,
    /.*\/api(.*)\/route\.(ts|js)$/,
    /.*\/\.next\/server\/app\/api(.*)\/route\.(ts|js)$/,
    /.*\/\.next\/server\/src\/app\/api(.*)\/route\.(ts|js)$/,
  ];
  
  for (const pattern of patterns) {
    const match = relativePath.match(pattern);
    if (match) {
      apiPath = '/api' + (match[1] || '');
      break;
    }
  }
  
  // Convert [param] to :param for OpenAPI style
  apiPath = apiPath.replace(/\[([^\]]+)\]/g, ':$1');
  
  console.log('[ENDPOINTS] Extracted API path:', apiPath);
  
  // Extract Swagger documentation
  const swaggerMatch = content.match(/\/\*\*\s*\n\s*\*\s*@swagger\s*\n([\s\S]*?)\*\//);
  let swaggerInfo: any = {};
  
  if (swaggerMatch) {
    try {
      const swaggerContent = swaggerMatch[1];
      swaggerInfo = parseSwaggerComment(swaggerContent);
      console.log('[ENDPOINTS] Parsed swagger info:', swaggerInfo);
    } catch (error) {
      console.warn(`[ENDPOINTS] Error parsing Swagger comment in ${filePath}:`, error);
    }
  }
  
  // Extract HTTP methods
  const methods = extractHttpMethods(content);
  console.log('[ENDPOINTS] Found HTTP methods:', methods);
  
  if (methods.length === 0) {
    console.log('[ENDPOINTS] No HTTP methods found in file:', filePath);
    return null;
  }
  
  // For now, take the first method found
  const method = methods[0];
  
  // Determine category based on path
  const category = determineCategory(apiPath);
  
  // Extract description from Swagger or generate default
  const description = swaggerInfo.summary || 
                    swaggerInfo.description || 
                    generateDefaultDescription(method, apiPath);
  
  // Check if authentication is required
  const hasAuth = content.includes('getAuthenticatedUser') || 
                  content.includes('bearerAuth') ||
                  content.includes('requireAuth') ||
                  content.includes('authenticate') ||
                  swaggerInfo.security;
  
  // Extract request/response examples
  const { requestBody, response } = extractExamples(content, swaggerInfo);
  
  const endpoint = {
    method: method.toUpperCase(),
    path: apiPath,
    description,
    category,
    requestBody,
    response,
    security: hasAuth
  };
  
  console.log('[ENDPOINTS] Created endpoint:', endpoint);
  return endpoint;
}

function parseSwaggerComment(swaggerContent: string): any {
  const lines = swaggerContent.split('\n').map(line => line.replace(/^\s*\*\s?/, ''));
  const info: any = {};
  
  // Simple parsing - could be enhanced with a proper YAML parser
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('summary:')) {
      info.summary = trimmed.replace('summary:', '').trim();
    } else if (trimmed.includes('description:')) {
      info.description = trimmed.replace('description:', '').trim();
    } else if (trimmed.includes('tags:')) {
      const tags = trimmed.replace('tags:', '').trim();
      info.tags = tags.replace(/[\[\]]/g, '').split(',').map(t => t.trim());
    } else if (trimmed.includes('security:')) {
      info.security = true;
    }
  }
  
  return info;
}

function extractHttpMethods(content: string): string[] {
  const methods: string[] = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  for (const method of httpMethods) {
    const regex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, 'i');
    if (regex.test(content)) {
      methods.push(method);
    }
  }
  
  return methods;
}

function determineCategory(path: string): string {
  if (path.includes('/auth/')) return 'Authentication';
  if (path.includes('/upload')) return 'File Management';
  if (path.includes('/analyze')) return 'Analysis';
  if (path.includes('/chatbot')) return 'AI Chat';
  if (path.includes('/analytics')) return 'Analytics';
  if (path.includes('/swagger')) return 'Documentation';
  return 'Other';
}

function generateDefaultDescription(method: string, path: string): string {
  const pathParts = path.split('/').filter(Boolean);
  const resource = pathParts[pathParts.length - 1] || 'resource';
  
  switch (method.toUpperCase()) {
    case 'GET':
      return `Get ${resource} data`;
    case 'POST':
      return `Create or process ${resource}`;
    case 'PUT':
      return `Update ${resource}`;
    case 'DELETE':
      return `Delete ${resource}`;
    case 'PATCH':
      return `Partially update ${resource}`;
    default:
      return `${method} ${resource}`;
  }
}

function extractExamples(content: string, swaggerInfo: any): { requestBody?: any, response?: any } {
  const examples: { requestBody?: any, response?: any } = {};
  
  // Extract common request/response patterns
  if (content.includes('email') && content.includes('password')) {
    if (content.includes('register') || content.includes('Register')) {
      examples.requestBody = {
        name: 'John Doe',
        email: 'user@example.com',
        password: 'password123'
      };
    } else {
      examples.requestBody = {
        email: 'user@example.com',
        password: 'password123'
      };
    }
  }
  
  if (content.includes('uploadIds')) {
    examples.requestBody = {
      uploadIds: ['upload_id_1', 'upload_id_2'],
      analysisType: 'default',
      customParameters: ['sentiment', 'key_points', 'action_items']
    };
  }
  
  if (content.includes('question')) {
    examples.requestBody = {
      question: 'What was the overall sentiment of the call?',
      analysisId: 'analysis_id'
    };
  }
  
  // Generate response examples based on common patterns
  if (content.includes('success: true')) {
    examples.response = { success: true };
    
    if (content.includes('token')) {
      examples.response = {
        success: true,
        token: 'jwt_token_here',
        user: { id: 'user_id', email: 'user@example.com', name: 'John Doe' }
      };
    }
    
    if (content.includes('uploads')) {
      examples.response = {
        success: true,
        uploads: [{ id: 'upload_id', filename: 'call.mp3', status: 'uploaded' }]
      };
    }
    
    if (content.includes('analysisId')) {
      examples.response = {
        success: true,
        analysisId: 'analysis_id',
        result: { sentiment: 'positive', key_points: ['Point 1', 'Point 2'] }
      };
    }
    
    if (content.includes('answer')) {
      examples.response = {
        success: true,
        answer: 'The overall sentiment was positive...',
        contextSource: 'Analysis: analysis_id'
      };
    }
    
    if (content.includes('analytics') || content.includes('Analytics')) {
      examples.response = {
        success: true,
        data: {
          totalUploads: 150,
          totalAnalyses: 120,
          avgSentiment: 7.5,
          trends: []
        }
      };
    }
  }
  
  return examples;
}

function getFallbackEndpoints(): APIEndpoint[] {
  console.log('[ENDPOINTS] Using fallback endpoint list');
  
  return [
    {
      method: 'GET',
      path: '/api/health',
      description: 'Health check endpoint',
      category: 'System',
      response: { success: true, status: 'healthy' },
      security: false
    },
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'Authenticate user and get access token',
      category: 'Authentication',
      requestBody: { email: 'user@example.com', password: 'password123' },
      response: { success: true, token: 'jwt_token_here' },
      security: false
    },
    {
      method: 'POST',
      path: '/api/auth/register',
      description: 'Register a new user account',
      category: 'Authentication',
      requestBody: { name: 'John Doe', email: 'user@example.com', password: 'password123' },
      response: { success: true, message: 'Registration successful' },
      security: false
    },
    {
      method: 'GET',
      path: '/api/auth/me',
      description: 'Get current user information',
      category: 'Authentication',
      response: { success: true, user: { id: 'user_id', email: 'user@example.com' } },
      security: true
    },
    {
      method: 'POST',
      path: '/api/auth/logout',
      description: 'Logout current user',
      category: 'Authentication',
      response: { success: true, message: 'Logged out successfully' },
      security: true
    },
    {
      method: 'POST',
      path: '/api/auth/forgot-password',
      description: 'Request password reset',
      category: 'Authentication',
      requestBody: { email: 'user@example.com' },
      response: { success: true, message: 'Reset email sent' },
      security: false
    },
    {
      method: 'POST',
      path: '/api/auth/reset-password',
      description: 'Reset password with token',
      category: 'Authentication',
      requestBody: { token: 'reset_token', password: 'new_password' },
      response: { success: true, message: 'Password reset successful' },
      security: false
    },
    {
      method: 'POST',
      path: '/api/auth/verify-email',
      description: 'Verify email with token',
      category: 'Authentication',
      requestBody: { token: 'verification_token' },
      response: { success: true, message: 'Email verified' },
      security: false
    },
    {
      method: 'POST',
      path: '/api/upload',
      description: 'Upload audio files for analysis',
      category: 'File Management',
      requestBody: 'FormData with files and customParameters',
      response: { success: true, uploads: [{ id: 'upload_id', filename: 'call.mp3' }] },
      security: true
    },
    {
      method: 'GET',
      path: '/api/upload',
      description: 'Get uploaded files list',
      category: 'File Management',
      response: { success: true, uploads: [] },
      security: true
    },
    {
      method: 'DELETE',
      path: '/api/upload',
      description: 'Delete uploaded file',
      category: 'File Management',
      response: { success: true, message: 'File deleted' },
      security: true
    },
    {
      method: 'POST',
      path: '/api/upload-large',
      description: 'Upload large audio files',
      category: 'File Management',
      requestBody: 'FormData with large files',
      response: { success: true, uploadId: 'upload_id' },
      security: true
    },
    {
      method: 'POST',
      path: '/api/analyze',
      description: 'Analyze uploaded audio files',
      category: 'Analysis',
      requestBody: { uploadIds: ['upload_id'], customParameters: ['sentiment'] },
      response: { success: true, analysisId: 'analysis_id' },
      security: true
    },
    {
      method: 'POST',
      path: '/api/analyze-transcription',
      description: 'Analyze transcription text',
      category: 'Analysis',
      requestBody: { transcription: 'transcription text', parameters: ['sentiment'] },
      response: { success: true, analysis: {} },
      security: true
    },
    {
      method: 'GET',
      path: '/api/analysis',
      description: 'Get analysis results',
      category: 'Analysis',
      response: { success: true, analyses: [] },
      security: true
    },
    {
      method: 'POST',
      path: '/api/chatbot',
      description: 'Chat with AI about analysis results',
      category: 'AI Chat',
      requestBody: { question: 'What was discussed?', analysisId: 'analysis_id' },
      response: { success: true, answer: 'AI response' },
      security: true
    },
    {
      method: 'GET',
      path: '/api/analytics',
      description: 'Get analytics and insights',
      category: 'Analytics',
      response: { success: true, data: { totalUploads: 150 } },
      security: true
    },
    {
      method: 'GET',
      path: '/api/insights',
      description: 'Get business insights',
      category: 'Analytics',
      response: { success: true, insights: [] },
      security: true
    },
    {
      method: 'POST',
      path: '/api/translate',
      description: 'Translate text to different languages',
      category: 'Other',
      requestBody: { text: 'Hello', targetLanguage: 'es' },
      response: { success: true, translatedText: 'Hola' },
      security: true
    },
    {
      method: 'POST',
      path: '/api/cleanup',
      description: 'Clean up temporary files',
      category: 'System',
      response: { success: true, message: 'Cleanup completed' },
      security: true
    }
  ];
}
