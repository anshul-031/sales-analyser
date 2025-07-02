'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Code, Key, Globe, Zap, Shield, FileText, Webhook, RefreshCw } from 'lucide-react';

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  category: string;
  requestBody?: any;
  response?: any;
  security?: boolean;
}

const IntegrationsPage = () => {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

  // Fetch endpoints from the dynamic API
  const fetchEndpoints = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      console.log('[INTEGRATIONS] Fetching endpoints from /api/endpoints...');
      
      const response = await fetch('/api/endpoints');
      console.log('[INTEGRATIONS] Response status:', response.status);
      console.log('[INTEGRATIONS] Response headers:', Object.fromEntries(response.headers.entries()));
      
      const data = await response.json();
      console.log('[INTEGRATIONS] Response data:', data);
      
      if (data.success) {
        console.log('[INTEGRATIONS] Successfully fetched', data.endpoints?.length || 0, 'endpoints');
        console.log('[INTEGRATIONS] Endpoints:', data.endpoints?.map((e: APIEndpoint) => `${e.method} ${e.path}`));
        setEndpoints(data.endpoints || []);
        setLastUpdated(data.lastUpdated);
        
        if (data.endpoints?.length === 0) {
          console.warn('[INTEGRATIONS] No endpoints returned from API');
          setError('No API endpoints found. The API may not be properly configured.');
        }
      } else {
        console.error('[INTEGRATIONS] API returned error:', data.error);
        console.error('[INTEGRATIONS] Debug info:', data.debug);
        throw new Error(data.error || 'Failed to fetch endpoints');
      }
    } catch (error) {
      console.error('[INTEGRATIONS] Failed to fetch endpoints:', error);
      setError(error instanceof Error ? error.message : 'Failed to load API endpoints');
      // Fallback to static endpoints if dynamic fetch fails
      if (endpoints.length === 0) {
        console.log('[INTEGRATIONS] Using fallback static endpoints');
        setEndpoints(staticEndpoints);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
    
    // Auto-refresh every 5 minutes to keep documentation up-to-date
    const interval = setInterval(() => {
      fetchEndpoints();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
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

  // Static fallback endpoints in case dynamic loading fails
  const staticEndpoints: APIEndpoint[] = [
    {
      method: 'POST',
      path: '/api/auth/login',
      description: 'Authenticate user and get access token',
      category: 'Authentication',
      requestBody: {
        email: 'user@example.com',
        password: 'password123'
      },
      response: {
        success: true,
        token: 'jwt_token_here',
        user: { id: 'user_id', email: 'user@example.com', name: 'John Doe' }
      }
    },
    {
      method: 'POST',
      path: '/api/auth/register',
      description: 'Register a new user account',
      category: 'Authentication',
      requestBody: {
        name: 'John Doe',
        email: 'user@example.com',
        password: 'password123'
      },
      response: {
        success: true,
        message: 'Registration successful',
        token: 'jwt_token_here'
      }
    },
    {
      method: 'POST',
      path: '/api/upload',
      description: 'Upload audio files for analysis',
      category: 'File Management',
      requestBody: 'FormData with files and customParameters',
      response: {
        success: true,
        uploads: [{ id: 'upload_id', filename: 'call.mp3', status: 'uploaded' }]
      }
    },
    {
      method: 'POST',
      path: '/api/analyze',
      description: 'Analyze uploaded audio files',
      category: 'Analysis',
      requestBody: {
        uploadIds: ['upload_id_1', 'upload_id_2'],
        analysisType: 'default',
        customParameters: ['sentiment', 'key_points', 'action_items']
      },
      response: {
        success: true,
        analysisId: 'analysis_id',
        result: { sentiment: 'positive', key_points: ['Point 1', 'Point 2'] }
      }
    },
    {
      method: 'POST',
      path: '/api/chatbot',
      description: 'Query analysis results with AI chatbot',
      category: 'AI Chat',
      requestBody: {
        question: 'What was the overall sentiment of the call?',
        analysisId: 'analysis_id'
      },
      response: {
        success: true,
        answer: 'The overall sentiment was positive...',
        contextSource: 'Analysis: analysis_id'
      }
    },
    {
      method: 'GET',
      path: '/api/analytics',
      description: 'Get analytics and insights data',
      category: 'Analytics',
      response: {
        success: true,
        data: {
          totalUploads: 150,
          totalAnalyses: 120,
          avgSentiment: 7.5,
          trends: []
        }
      }
    }
  ];

  const codeExamples = {
    javascript: `
// Install required packages
// npm install axios

const axios = require('axios');

class SalesAnalyzerAPI {
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: \`Bearer \${token}\` })
      }
    });
  }

  // Authentication
  async login(email, password) {
    const response = await this.client.post('/api/auth/login', {
      email,
      password
    });
    
    if (response.data.success) {
      this.token = response.data.token;
      this.client.defaults.headers.Authorization = \`Bearer \${this.token}\`;
    }
    
    return response.data;
  }

  // Upload files
  async uploadFiles(files, customParameters = []) {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    if (customParameters.length > 0) {
      formData.append('customParameters', JSON.stringify(customParameters));
    }

    const response = await this.client.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
  }

  // Analyze files
  async analyzeFiles(uploadIds, analysisType = 'default', customParameters = []) {
    const response = await this.client.post('/api/analyze', {
      uploadIds,
      analysisType,
      customParameters
    });

    return response.data;
  }

  // Chat with AI about analysis
  async chatAboutAnalysis(question, analysisId) {
    const response = await this.client.post('/api/chatbot', {
      question,
      analysisId
    });

    return response.data;
  }

  // Get analytics
  async getAnalytics() {
    const response = await this.client.get('/api/analytics');
    return response.data;
  }
}

// Usage example
async function example() {
  const api = new SalesAnalyzerAPI('${baseUrl}');
  
  // Login
  const loginResult = await api.login('user@example.com', 'password');
  console.log('Login successful:', loginResult.success);
  
  // Upload and analyze
  const files = [/* File objects */];
  const uploadResult = await api.uploadFiles(files, ['sentiment', 'key_points']);
  
  if (uploadResult.success) {
    const uploadIds = uploadResult.uploads.map(u => u.id);
    const analysisResult = await api.analyzeFiles(uploadIds);
    
    if (analysisResult.success) {
      // Chat about the analysis
      const chatResult = await api.chatAboutAnalysis(
        'What were the main points discussed?',
        analysisResult.analysisId
      );
      console.log('AI Response:', chatResult.answer);
    }
  }
}
`,
    python: `
# Install required packages
# pip install requests

import requests
import json
from typing import List, Dict, Any, Optional

class SalesAnalyzerAPI:
    def __init__(self, base_url: str, token: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.session = requests.Session()
        
        if token:
            self.session.headers.update({'Authorization': f'Bearer {token}'})
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request with error handling."""
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and set token."""
        data = {'email': email, 'password': password}
        result = self._request('POST', '/api/auth/login', json=data)
        
        if result.get('success') and 'token' in result:
            self.token = result['token']
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        
        return result
    
    def upload_files(self, files: List[tuple], custom_parameters: List[str] = None) -> Dict[str, Any]:
        """Upload audio files for analysis."""
        files_data = [('files', file) for file in files]
        data = {}
        
        if custom_parameters:
            data['customParameters'] = json.dumps(custom_parameters)
        
        return self._request('POST', '/api/upload', files=files_data, data=data)
    
    def analyze_files(self, upload_ids: List[str], analysis_type: str = 'default', 
                     custom_parameters: List[str] = None) -> Dict[str, Any]:
        """Analyze uploaded files."""
        data = {
            'uploadIds': upload_ids,
            'analysisType': analysis_type
        }
        
        if custom_parameters:
            data['customParameters'] = custom_parameters
        
        return self._request('POST', '/api/analyze', json=data)
    
    def chat_about_analysis(self, question: str, analysis_id: str) -> Dict[str, Any]:
        """Chat with AI about analysis results."""
        data = {
            'question': question,
            'analysisId': analysis_id
        }
        return self._request('POST', '/api/chatbot', json=data)
    
    def get_analytics(self) -> Dict[str, Any]:
        """Get analytics and insights."""
        return self._request('GET', '/api/analytics')

# Usage example
def main():
    api = SalesAnalyzerAPI('${baseUrl}')
    
    # Login
    login_result = api.login('user@example.com', 'password')
    print(f"Login successful: {login_result.get('success')}")
    
    # Upload files
    with open('call.mp3', 'rb') as f:
        files = [(f.name, f.read(), 'audio/mpeg')]
    
    upload_result = api.upload_files(files, ['sentiment', 'key_points'])
    
    if upload_result.get('success'):
        upload_ids = [u['id'] for u in upload_result['uploads']]
        
        # Analyze files
        analysis_result = api.analyze_files(upload_ids)
        
        if analysis_result.get('success'):
            # Chat about analysis
            chat_result = api.chat_about_analysis(
                'What were the main discussion points?',
                analysis_result['analysisId']
            )
            print(f"AI Response: {chat_result.get('answer')}")

if __name__ == '__main__':
    main()
`,
    curl: `
# 1. Authentication
curl -X POST "${baseUrl}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Save the token from response
export TOKEN="your_jwt_token_here"

# 2. Upload files
curl -X POST "${baseUrl}/api/upload" \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "files=@call1.mp3" \\
  -F "files=@call2.wav" \\
  -F 'customParameters=["sentiment","key_points","action_items"]'

# 3. Analyze uploaded files
curl -X POST "${baseUrl}/api/analyze" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "uploadIds": ["upload_id_1", "upload_id_2"],
    "analysisType": "default",
    "customParameters": ["sentiment", "key_points", "action_items"]
  }'

# 4. Chat about analysis
curl -X POST "${baseUrl}/api/chatbot" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "question": "What was the overall sentiment of the call?",
    "analysisId": "analysis_id_from_previous_response"
  }'

# 5. Get analytics
curl -X GET "${baseUrl}/api/analytics" \\
  -H "Authorization: Bearer $TOKEN"
`
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [activeCodeTab, setActiveCodeTab] = useState('javascript');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
            <Code className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            API Integration Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Integrate AI Call Analyzer's powerful AI-driven call analysis capabilities into your applications.
            Our REST API provides comprehensive access to upload, analyze, and query sales call data.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-white rounded-lg p-2 shadow-sm border">
          {[
            { id: 'overview', label: 'Overview', icon: Globe },
            { id: 'endpoints', label: 'API Endpoints', icon: Webhook },
            { id: 'authentication', label: 'Authentication', icon: Shield },
            { id: 'examples', label: 'Code Examples', icon: FileText },
            { id: 'swagger', label: 'API Documentation', icon: ExternalLink }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Features */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Zap className="w-6 h-6 text-blue-600" />
                Key Features
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: 'Audio Upload & Processing',
                    description: 'Upload multiple audio formats (MP3, WAV, M4A) with automatic transcription',
                    color: 'from-green-500 to-emerald-500'
                  },
                  {
                    title: 'AI-Powered Analysis',
                    description: 'Advanced sentiment analysis, key point extraction, and custom parameter analysis',
                    color: 'from-blue-500 to-cyan-500'
                  },
                  {
                    title: 'Interactive AI Chat',
                    description: 'Query your analysis results with natural language using our AI chatbot',
                    color: 'from-purple-500 to-pink-500'
                  },
                  {
                    title: 'Analytics & Insights',
                    description: 'Comprehensive analytics dashboard with trends and performance metrics',
                    color: 'from-orange-500 to-red-500'
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${feature.color} mt-2`}></div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Start */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-green-600" />
                Quick Start
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Get API Access</h3>
                    <p className="text-gray-600 text-sm">Register for an account and obtain your API credentials</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Authenticate</h3>
                    <p className="text-gray-600 text-sm">Use your credentials to get a JWT token for API access</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Upload & Analyze</h3>
                    <p className="text-gray-600 text-sm">Upload audio files and trigger AI analysis</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Query Results</h3>
                    <p className="text-gray-600 text-sm">Use our AI chatbot to query and understand your analysis results</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Base URL</h4>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-3 py-1 rounded text-sm text-blue-800 border flex-1">
                    {baseUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(baseUrl, 'baseUrl')}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    {copiedStates.baseUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">API Endpoints</h2>
              <div className="flex items-center gap-4">
                {lastUpdated && (
                  <span className="text-sm text-gray-500">
                    Last updated: {new Date(lastUpdated).toLocaleString()}
                  </span>
                )}
                <button
                  onClick={() => fetchEndpoints(true)}
                  disabled={loading || refreshing}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading API endpoints...</p>
                </div>
              </div>
            ) : error ? (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-800 font-medium">
                    Failed to load live API documentation
                  </span>
                </div>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                <p className="text-red-600 text-sm">
                  Showing fallback documentation. The API endpoints may not reflect the latest changes.
                </p>
              </div>
            ) : null}
            
            {/* Debug Information */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <details className="cursor-pointer">
                  <summary className="font-medium text-yellow-800 mb-2">Debug Information (Development Mode)</summary>
                  <div className="text-sm text-yellow-700 space-y-2">
                    <div><strong>Environment:</strong> {typeof window !== 'undefined' ? 'Client' : 'Server'}</div>
                    <div><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
                    <div><strong>Base URL:</strong> {baseUrl}</div>
                    <div><strong>Endpoints Loaded:</strong> {endpoints.length}</div>
                    <div><strong>Loading State:</strong> {loading ? 'Loading' : 'Loaded'}</div>
                    <div><strong>Error State:</strong> {error || 'None'}</div>
                    <div><strong>Last Updated:</strong> {lastUpdated || 'Never'}</div>
                    {endpoints.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">Endpoint Details</summary>
                        <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto">
                          {JSON.stringify(endpoints.map(e => ({method: e.method, path: e.path, category: e.category})), null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </details>
              </div>
            )}
            
            {!loading && (
              <>
                {!error && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-800 font-medium">
                        Live API Documentation - {endpoints.length} endpoints discovered
                      </span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      This documentation is automatically generated from your actual API code and updates in real-time.
                    </p>
                  </div>
                )}
                
                {/* Group endpoints by category */}
                {['Authentication', 'File Management', 'Analysis', 'AI Chat', 'Analytics', 'Documentation', 'Other'].map(category => {
                  const categoryEndpoints = endpoints.filter(endpoint => endpoint.category === category);
                  if (categoryEndpoints.length === 0) return null;
                  
                  return (
                    <div key={category} className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {category}
                        <span className="text-sm font-normal text-gray-500">({categoryEndpoints.length})</span>
                      </h3>
                      
                      <div className="space-y-4">
                        {categoryEndpoints.map((endpoint, index) => (
                          <div key={`${endpoint.method}-${endpoint.path}`} className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 p-4 border-b">
                              <div className="flex items-center gap-4 mb-2">
                                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                                  endpoint.method === 'GET' ? 'bg-green-100 text-green-700' : 
                                  endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                                  endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                  endpoint.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {endpoint.method}
                                </span>
                                <code className="text-gray-800 font-mono">{endpoint.path}</code>
                                {endpoint.security && (
                                  <div title="Requires authentication">
                                    <Shield className="w-4 h-4 text-yellow-600" />
                                  </div>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm">{endpoint.description}</p>
                            </div>
                            
                            <div className="p-4 space-y-4">
                              {endpoint.requestBody && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2">Request Body:</h4>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                                    <code>{typeof endpoint.requestBody === 'string' ? endpoint.requestBody : JSON.stringify(endpoint.requestBody, null, 2)}</code>
                                  </pre>
                                </div>
                              )}
                              
                              {endpoint.response && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-2">Response:</h4>
                                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                                    <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'authentication' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-600" />
              Authentication
            </h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-3">JWT Token Authentication</h3>
                <p className="text-green-700 mb-4">
                  Our API uses JSON Web Tokens (JWT) for authentication. All protected endpoints require a valid JWT token in the Authorization header.
                </p>
                
                <div className="bg-white p-4 rounded border">
                  <h4 className="font-semibold text-gray-700 mb-2">Header Format:</h4>
                  <code className="block bg-gray-100 p-2 rounded text-sm">
                    Authorization: Bearer YOUR_JWT_TOKEN
                  </code>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Registration</h3>
                  <p className="text-gray-600 mb-4">Create a new account to get API access.</p>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <code className="text-sm">
                      POST /api/auth/register
                    </code>
                    <pre className="mt-2 text-xs text-gray-600">
{`{
  "name": "Your Name",
  "email": "your@email.com",
  "password": "secure_password"
}`}
                    </pre>
                  </div>
                </div>

                <div className="p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Login</h3>
                  <p className="text-gray-600 mb-4">Authenticate and receive your JWT token.</p>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <code className="text-sm">
                      POST /api/auth/login
                    </code>
                    <pre className="mt-2 text-xs text-gray-600">
{`{
  "email": "your@email.com",
  "password": "your_password"
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ Security Notes</h3>
                <ul className="space-y-2 text-yellow-800">
                  <li>• Store JWT tokens securely (never in localStorage for production apps)</li>
                  <li>• Tokens expire after 24 hours - implement refresh logic</li>
                  <li>• Use HTTPS for all API calls in production</li>
                  <li>• Implement proper error handling for authentication failures</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-purple-600" />
              Code Examples
            </h2>
            
            {/* Language selector */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
              {[
                { id: 'javascript', label: 'JavaScript' },
                { id: 'python', label: 'Python' },
                { id: 'curl', label: 'cURL' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveCodeTab(id)}
                  className={`px-4 py-2 rounded-md font-medium transition-all ${
                    activeCodeTab === id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => copyToClipboard(codeExamples[activeCodeTab as keyof typeof codeExamples], activeCodeTab)}
                className="absolute top-4 right-4 p-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors z-10"
              >
                {copiedStates[activeCodeTab] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              
              <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto text-sm">
                <code>{codeExamples[activeCodeTab as keyof typeof codeExamples]}</code>
              </pre>
            </div>

            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Integration Tips</h3>
              <ul className="space-y-2 text-blue-800">
                <li>• Handle file uploads using FormData for multipart requests</li>
                <li>• Implement retry logic for network failures</li>
                <li>• Use async/await or promises for better error handling</li>
                <li>• Store and reuse JWT tokens to avoid repeated authentication</li>
                <li>• Implement progress tracking for large file uploads</li>
                <li>• Use webhooks (if available) for real-time analysis updates</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'swagger' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <ExternalLink className="w-6 h-6 text-indigo-600" />
              API Documentation
            </h2>
            
            <div className="space-y-6">
              {/* Live Documentation Status */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-800 font-medium">
                    Auto-Updating Documentation
                  </span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  The Swagger documentation is dynamically generated from your code and always reflects the latest API changes.
                </p>
              </div>
              
              <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3">Interactive API Documentation</h3>
                <p className="text-indigo-700 mb-4">
                  Explore our full API documentation with interactive examples and testing capabilities.
                </p>
                
                <div className="flex gap-4">
                  <a
                    href="/api/swagger"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Swagger UI
                  </a>
                  
                  <a
                    href="/api/swagger.json"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg border border-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Download OpenAPI Spec
                  </a>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 What's Included</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Complete API endpoint documentation</li>
                    <li>• Request/response schemas</li>
                    <li>• Interactive testing interface</li>
                    <li>• Authentication examples</li>
                    <li>• Error code references</li>
                    <li>• Rate limiting information</li>
                  </ul>
                </div>

                <div className="p-6 border rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🛠️ Development Tools</h3>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Generate client SDKs in multiple languages</li>
                    <li>• Import into Postman or Insomnia</li>
                    <li>• Mock server generation</li>
                    <li>• Validation and testing tools</li>
                    <li>• Code generation utilities</li>
                    <li>• Documentation export options</li>
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">OpenAPI Specification</h3>
                <p className="text-gray-600 mb-4">
                  Our API follows the OpenAPI 3.0 specification, making it compatible with a wide range of tools and frameworks.
                </p>
                
                <div className="bg-white p-4 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Specification URL:</span>
                    <button
                      onClick={() => copyToClipboard(`${baseUrl}/api/swagger.json`, 'swaggerUrl')}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      {copiedStates.swaggerUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <code className="text-sm text-blue-600">{baseUrl}/api/swagger.json</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-gray-500 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">API Status: Online</span>
          </div>
          <p className="text-gray-600">
            Need help? Contact our support team or check out the{' '}
            <a href="/docs" className="text-blue-600 hover:underline">
              documentation
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
