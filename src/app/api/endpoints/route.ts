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
    const endpoints = await extractAPIEndpoints();
    
    return NextResponse.json({
      success: true,
      endpoints,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error extracting API endpoints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract API endpoints' },
      { status: 500 }
    );
  }
}

async function extractAPIEndpoints(): Promise<APIEndpoint[]> {
  const apiPath = path.join(process.cwd(), 'src', 'app', 'api');
  const endpoints: APIEndpoint[] = [];

  // Recursively find all route.ts files
  const routeFiles = await findRouteFiles(apiPath);
  
  for (const filePath of routeFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const endpoint = parseRouteFile(content, filePath);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    } catch (error) {
      console.error(`Error parsing route file ${filePath}:`, error);
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}

async function findRouteFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findRouteFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Directory doesn't exist or can't be read
    console.warn(`Cannot read directory ${dir}:`, error);
  }
  
  return files;
}

function parseRouteFile(content: string, filePath: string): APIEndpoint | null {
  const relativePath = filePath.replace(process.cwd(), '').replace(/\\/g, '/');
  
  // Extract the API path from file path
  const apiPath = relativePath
    .replace('/src/app/api', '/api')
    .replace('/route.ts', '')
    .replace(/\[([^\]]+)\]/g, ':$1'); // Convert [param] to :param
  
  // Extract Swagger documentation
  const swaggerMatch = content.match(/\/\*\*\s*\n\s*\*\s*@swagger\s*\n([\s\S]*?)\*\//);
  let swaggerInfo: any = {};
  
  if (swaggerMatch) {
    try {
      const swaggerContent = swaggerMatch[1];
      swaggerInfo = parseSwaggerComment(swaggerContent);
    } catch (error) {
      console.warn(`Error parsing Swagger comment in ${filePath}:`, error);
    }
  }
  
  // Extract HTTP methods
  const methods = extractHttpMethods(content);
  
  if (methods.length === 0) {
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
                  swaggerInfo.security;
  
  // Extract request/response examples
  const { requestBody, response } = extractExamples(content, swaggerInfo);
  
  return {
    method: method.toUpperCase(),
    path: apiPath,
    description,
    category,
    requestBody,
    response,
    security: hasAuth
  };
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
