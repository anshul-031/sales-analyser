'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Play, Shield, Code, FileText } from 'lucide-react';

interface APIEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  security?: string[];
  parameters?: any[];
  requestBody?: any;
  responses: any;
}

export default function SwaggerPage() {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/swagger.json');
        if (!response.ok) {
          throw new Error('Failed to fetch API specification');
        }
        const data = await response.json();
        setSpec(data);
      } catch (err) {
        console.error('Failed to load API specification:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleEndpoint = (endpointKey: string) => {
    setExpandedEndpoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(endpointKey)) {
        newSet.delete(endpointKey);
      } else {
        newSet.add(endpointKey);
      }
      return newSet;
    });
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'bg-blue-500';
      case 'post': return 'bg-green-500';
      case 'put': return 'bg-yellow-500';
      case 'delete': return 'bg-red-500';
      case 'patch': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const endpoints: APIEndpoint[] = [
    {
      path: '/api/auth/login',
      method: 'POST',
      summary: 'User Authentication',
      description: 'Authenticate user with email and password to receive JWT token',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                password: { type: 'string', example: 'password123' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Successful authentication',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'user_123' },
                      email: { type: 'string', example: 'user@example.com' },
                      name: { type: 'string', example: 'John Doe' }
                    }
                  }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Invalid email or password' }
                }
              }
            }
          }
        }
      }
    },
    {
      path: '/api/auth/register',
      method: 'POST',
      summary: 'User Registration',
      description: 'Register a new user account',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', format: 'email', example: 'user@example.com' },
                password: { type: 'string', example: 'password123' }
              }
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'User created successfully' },
                  token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
                }
              }
            }
          }
        }
      }
    },
    {
      path: '/api/upload',
      method: 'POST',
      summary: 'Upload Audio Files',
      description: 'Upload one or more audio files for analysis',
      tags: ['File Management'],
      security: ['bearerAuth'],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Audio files to upload (MP3, WAV, M4A)'
                },
                customParameters: {
                  type: 'string',
                  description: 'JSON array of custom analysis parameters',
                  example: '["sentiment", "key_points", "action_items"]'
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Files uploaded successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  uploads: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'upload_123' },
                        filename: { type: 'string', example: 'call_recording.mp3' },
                        size: { type: 'number', example: 2048576 },
                        status: { type: 'string', example: 'uploaded' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      path: '/api/analyze',
      method: 'POST',
      summary: 'Analyze Audio Files',
      description: 'Perform AI analysis on uploaded audio files',
      tags: ['Analysis'],
      security: ['bearerAuth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['uploadIds', 'analysisType'],
              properties: {
                uploadIds: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['upload_123', 'upload_456']
                },
                analysisType: {
                  type: 'string',
                  enum: ['default', 'custom', 'parameters'],
                  example: 'default'
                },
                customParameters: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['sentiment', 'key_points', 'action_items']
                }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Analysis completed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  analysisId: { type: 'string', example: 'analysis_789' },
                  result: {
                    type: 'object',
                    example: {
                      sentiment: 'positive',
                      sentiment_score: 8.5,
                      key_points: ['Discussed pricing', 'Customer interested in premium plan'],
                      action_items: ['Send proposal', 'Schedule follow-up call']
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      path: '/api/chatbot',
      method: 'POST',
      summary: 'AI Chat Query',
      description: 'Query analysis results using AI chatbot',
      tags: ['AI Chat'],
      security: ['bearerAuth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['question'],
              properties: {
                question: { type: 'string', example: 'What was the overall sentiment of the call?' },
                analysisId: { type: 'string', example: 'analysis_789' },
                uploadId: { type: 'string', example: 'upload_123' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'AI response generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  answer: {
                    type: 'string',
                    example: 'The overall sentiment of the call was positive with a score of 8.5/10. The customer showed strong interest in the premium plan and the conversation was collaborative.'
                  },
                  contextSource: { type: 'string', example: 'Analysis: analysis_789' }
                }
              }
            }
          }
        }
      }
    },
    {
      path: '/api/analytics',
      method: 'GET',
      summary: 'Get Analytics Data',
      description: 'Retrieve analytics and insights data',
      tags: ['Analytics'],
      security: ['bearerAuth'],
      responses: {
        '200': {
          description: 'Analytics data retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      totalUploads: { type: 'number', example: 150 },
                      totalAnalyses: { type: 'number', example: 120 },
                      avgSentiment: { type: 'number', example: 7.5 },
                      successRate: { type: 'number', example: 96.8 }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Sales Analyser API</h1>
              <p className="text-blue-100">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-lg text-blue-100 max-w-3xl">
            AI-powered sales call analysis API for transcription, sentiment analysis, and insights generation.
            Integrate powerful voice analytics into your applications.
          </p>
          
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => copyToClipboard(window.location.origin + '/api/swagger.json', 'specUrl')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
            >
              {copiedStates.specUrl ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              OpenAPI Spec
            </button>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
              <Shield className="w-4 h-4" />
              JWT Authentication
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Authentication Info */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Authentication
            </h2>
            <p className="text-gray-600 mb-4">
              This API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              Authorization: Bearer YOUR_JWT_TOKEN
            </div>
          </div>

          {/* Endpoints */}
          <div className="space-y-4">
            {endpoints.map((endpoint) => {
              const endpointKey = `${endpoint.method}-${endpoint.path}`;
              const isExpanded = expandedEndpoints.has(endpointKey);

              return (
                <div key={endpointKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleEndpoint(endpointKey)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 text-xs font-semibold text-white rounded ${getMethodColor(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <code className="text-gray-800 font-mono">{endpoint.path}</code>
                      <span className="text-gray-600">{endpoint.summary}</span>
                      {endpoint.security && (
                        <div title="Requires authentication">
                          <Shield className="w-4 h-4 text-yellow-600" />
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      <div className="p-6 space-y-6">
                        <p className="text-gray-700">{endpoint.description}</p>

                        {endpoint.requestBody && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Request Body</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <pre className="text-sm text-gray-800 overflow-x-auto">
                                {JSON.stringify(endpoint.requestBody, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}

                        {endpoint.responses && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Responses</h4>
                            <div className="space-y-3">
                              {Object.entries(endpoint.responses).map(([statusCode, response]: [string, any]) => (
                                <div key={statusCode} className="border rounded-lg overflow-hidden">
                                  <div className={`px-4 py-2 text-sm font-medium ${
                                    statusCode.startsWith('2') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                  }`}>
                                    {statusCode} - {response.description}
                                  </div>
                                  {response.content && (
                                    <div className="p-4 bg-gray-50">
                                      <pre className="text-sm text-gray-800 overflow-x-auto">
                                        {JSON.stringify(response.content, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                            <Play className="w-4 h-4" />
                            Try it out
                          </button>
                          <button
                            onClick={() => copyToClipboard(`curl -X ${endpoint.method} "${window.location.origin}${endpoint.path}"`, `curl-${endpointKey}`)}
                            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                          >
                            {copiedStates[`curl-${endpointKey}`] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            Copy cURL
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
