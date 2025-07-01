import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sales Analyser API',
      version: '1.0.0',
      description: 'AI-powered sales call analysis API for transcription, sentiment analysis, and insights generation',
      contact: {
        name: 'Sales Analyser Support',
        email: 'support@salesanalyser.com',
        url: 'https://salesanalyser.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique user identifier' },
            email: { type: 'string', format: 'email', description: 'User email address' },
            name: { type: 'string', description: 'User full name' },
            createdAt: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
            updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 6, example: 'password123' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 2, example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 6, example: 'password123' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            token: { type: 'string', description: 'JWT authentication token' },
            user: { $ref: '#/components/schemas/User' },
            message: { type: 'string', description: 'Response message' }
          }
        },
        Upload: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique upload identifier' },
            userId: { type: 'string', description: 'Owner user ID' },
            originalName: { type: 'string', description: 'Original filename' },
            filename: { type: 'string', description: 'Stored filename' },
            mimeType: { type: 'string', description: 'File MIME type' },
            size: { type: 'integer', description: 'File size in bytes' },
            duration: { type: 'number', description: 'Audio duration in seconds' },
            status: { 
              type: 'string', 
              enum: ['uploaded', 'processing', 'completed', 'failed'],
              description: 'Upload processing status'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            uploads: {
              type: 'array',
              items: { $ref: '#/components/schemas/Upload' }
            },
            message: { type: 'string' }
          }
        },
        AnalyzeRequest: {
          type: 'object',
          required: ['uploadIds', 'analysisType'],
          properties: {
            uploadIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of upload IDs to analyze',
              example: ['upload_id_1', 'upload_id_2']
            },
            analysisType: {
              type: 'string',
              enum: ['default', 'custom', 'parameters'],
              description: 'Type of analysis to perform',
              example: 'default'
            },
            customPrompt: {
              type: 'string',
              description: 'Custom analysis prompt (required for custom analysis)',
              example: 'Analyze the sentiment and key discussion points'
            },
            customParameters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Custom analysis parameters',
              example: ['sentiment', 'key_points', 'action_items', 'customer_satisfaction']
            }
          }
        },
        Analysis: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique analysis identifier' },
            userId: { type: 'string', description: 'Owner user ID' },
            uploadId: { type: 'string', description: 'Associated upload ID' },
            analysisType: {
              type: 'string',
              enum: ['default', 'custom', 'parameters'],
              description: 'Type of analysis performed'
            },
            transcription: { type: 'string', description: 'Audio transcription text' },
            analysisResult: {
              type: 'object',
              description: 'Analysis results object with various metrics',
              additionalProperties: true
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: 'Analysis processing status'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        AnalyzeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            analysisId: { type: 'string', description: 'Generated analysis ID' },
            result: {
              type: 'object',
              description: 'Analysis results',
              additionalProperties: true
            },
            message: { type: 'string' }
          }
        },
        ChatRequest: {
          type: 'object',
          required: ['question'],
          properties: {
            question: {
              type: 'string',
              description: 'Question to ask about the analysis',
              example: 'What was the overall sentiment of the call?'
            },
            analysisId: {
              type: 'string',
              description: 'Specific analysis ID to query (optional)',
              example: 'analysis_id_123'
            },
            uploadId: {
              type: 'string',
              description: 'Specific upload ID to query (optional)',
              example: 'upload_id_123'
            }
          }
        },
        ChatResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            answer: {
              type: 'string',
              description: 'AI-generated response to the question',
              example: 'The overall sentiment of the call was positive, with a confidence score of 8.5/10.'
            },
            contextSource: {
              type: 'string',
              description: 'Source of context used for the answer',
              example: 'Analysis: analysis_id_123'
            },
            message: { type: 'string' }
          }
        },
        AnalyticsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                totalUploads: { type: 'integer', description: 'Total number of uploads', example: 150 },
                totalAnalyses: { type: 'integer', description: 'Total number of analyses', example: 120 },
                avgSentiment: { type: 'number', description: 'Average sentiment score', example: 7.5 },
                avgDuration: { type: 'number', description: 'Average call duration in minutes', example: 25.3 },
                successRate: { type: 'number', description: 'Analysis success rate percentage', example: 96.8 },
                trends: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      uploads: { type: 'integer' },
                      sentiment: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', description: 'Error message' },
            details: { type: 'string', description: 'Additional error details' },
            code: { type: 'string', description: 'Error code' }
          }
        },
        EndpointInfo: {
          type: 'object',
          properties: {
            method: { type: 'string', example: 'POST' },
            path: { type: 'string', example: '/api/auth/login' },
            description: { type: 'string', example: 'User authentication' },
            category: { type: 'string', example: 'Authentication' },
            security: { type: 'boolean', example: false },
            requestBody: { type: 'object', additionalProperties: true },
            response: { type: 'object', additionalProperties: true }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/app/api/**/route.ts'], // Path to the API docs
};

// Generate the swagger spec
export const swaggerSpec = swaggerJSDoc(options);

// Function to regenerate swagger spec dynamically
export const regenerateSwaggerSpec = async () => {
  return swaggerJSDoc(options);
};
