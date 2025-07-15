# Copilot Code Templates for AI Call Performance Analyzer

## API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, /* other params */ } = body;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: userId'
      }, { status: 400 });
    }

    // Implementation logic here
    
    return NextResponse.json({
      success: true,
      data: {
        // Response data
      }
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

## React Component Template
```typescript
'use client';

import { useState, useEffect } from 'react';
import { ComponentNameProps } from './types';

interface ComponentNameProps {
  userId: string;
  // Add other props
}

export default function ComponentName({ userId }: ComponentNameProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Component initialization
  }, [userId]);

  const handleAction = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Implementation
    } catch (err) {
      console.error('[ComponentName] Error:', err);
      setError('Failed to perform action');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Component JSX */}
    </div>
  );
}
```

## Gemini Service Integration
```typescript
import { GeminiAnalysisService } from '@/lib/gemini';

const geminiService = new GeminiAnalysisService();

// For analysis
const analysisResult = await geminiService.analyzeWithDefaultParameters(
  transcription,
  userId
);

// For chatbot
const chatResponse = await geminiService.generateChatbotResponse(
  prompt
);
```

## Memory Storage Pattern
```typescript
import { 
  saveAnalysis,
  getAnalysisByUserId,
  saveUpload,
  getUploadsByUserId 
} from '@/lib/memory-storage';

// Save analysis
await saveAnalysis({
  id: analysisId,
  userId,
  status: 'completed',
  result: analysisData,
  // ... other fields
});

// Retrieve data
const analyses = await getAnalysisByUserId(userId);
```

## Error Handling Pattern
```typescript
try {
  // Main operation
} catch (error) {
  console.error('[Context] Error:', error);
  
  // Specific error handling
  if (error instanceof Error) {
    if (error.message.includes('API_KEY_INVALID')) {
      return 'AI service configuration error';
    }
    if (error.message.includes('QUOTA_EXCEEDED')) {
      return 'Service quota exceeded';
    }
  }
  
  // Generic error
  return 'Operation failed';
}
```

## File Upload Validation
```typescript
const validateAudioFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'audio/mpeg', 'audio/wav', 'audio/mp4',
    'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm'
  ];

  if (file.size > maxSize) {
    return 'File size must be less than 5MB';
  }

  if (!allowedTypes.includes(file.type)) {
    return 'Unsupported file format';
  }

  return null; // Valid file
};
```

## Loading State UI
```typescript
{isLoading && (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Processing...</span>
  </div>
)}
```

## Analysis Status Display
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'processing': return 'text-blue-600 bg-blue-100';
    case 'error': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

<span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
  {status}
</span>
```

## Tailwind Responsive Design
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
    {/* Card content */}
  </div>
</div>
```

## Unit Test Templates

### Component Test Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import ComponentName from './ComponentName';

// Mock external dependencies
jest.mock('@/lib/gemini', () => ({
  GeminiAnalysisService: jest.fn().mockImplementation(() => ({
    analyzeWithDefaultParameters: jest.fn().mockResolvedValue({
      overallScore: 8.5,
      parameters: []
    }))
  }))
}));

describe('ComponentName', () => {
  const defaultProps = {
    userId: 'test-user-123',
    analysisId: 'test-analysis-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render without crashing', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByTestId('component-name')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle user interactions correctly', async () => {
    const user = userEvent.setup();
    render(<ComponentName {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should handle error states properly', async () => {
    // Mock error scenario
    const mockError = new Error('Test error');
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);
    
    render(<ComponentName {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
    
    expect(console.error).toHaveBeenCalledWith(
      '[ComponentName] Error:',
      expect.any(Error)
    );
  });

  it('should handle missing props gracefully', () => {
    const { userId, ...propsWithoutUserId } = defaultProps;
    render(<ComponentName {...propsWithoutUserId} />);
    
    expect(screen.getByText(/invalid user/i)).toBeInTheDocument();
  });
});
```

### API Route Test Template
```typescript
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock external services
jest.mock('@/lib/gemini', () => ({
  GeminiAnalysisService: jest.fn().mockImplementation(() => ({
    analyzeWithDefaultParameters: jest.fn().mockResolvedValue({
      overallScore: 8.5,
      parameters: []
    })
  }))
}));

jest.mock('@/lib/memory-storage', () => ({
  saveAnalysis: jest.fn().mockResolvedValue(true),
  getAnalysisByUserId: jest.fn().mockResolvedValue([])
}));

describe('/api/endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with valid data', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user-123',
        data: 'test-data'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });

  it('should handle missing userId parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('userId');
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: 'invalid json'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });

  it('should handle service errors gracefully', async () => {
    // Mock service error
    const { GeminiAnalysisService } = require('@/lib/gemini');
    GeminiAnalysisService.mockImplementation(() => ({
      analyzeWithDefaultParameters: jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      )
    }));

    const request = new NextRequest('http://localhost:3000/api/endpoint', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user-123'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
```

### Service Layer Test Template
```typescript
import { GeminiAnalysisService } from './gemini';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            overallScore: 8.5,
            parameters: []
          })
        }
      })
    })
  }))
}));

describe('GeminiAnalysisService', () => {
  let service: GeminiAnalysisService;

  beforeEach(() => {
    service = new GeminiAnalysisService();
    jest.clearAllMocks();
  });

  describe('analyzeWithDefaultParameters', () => {
    it('should analyze transcription successfully', async () => {
      const transcription = 'Hello, this is a test call transcription.';
      
      const result = await service.analyzeWithDefaultParameters(transcription);
      
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('parameters');
      expect(typeof result.overallScore).toBe('number');
      expect(Array.isArray(result.parameters)).toBe(true);
    });

    it('should handle empty transcription', async () => {
      const result = await service.analyzeWithDefaultParameters('');
      
      expect(result.overallScore).toBe(0);
      expect(result.parameters).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue(mockError)
        })
      }));

      await expect(
        service.analyzeWithDefaultParameters('test')
      ).rejects.toThrow('API Error');
    });

    it('should handle invalid JSON response', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              text: () => 'invalid json'
            }
          })
        })
      }));

      await expect(
        service.analyzeWithDefaultParameters('test')
      ).rejects.toThrow();
    });
  });

  describe('extractActionItems', () => {
    it('should extract action items from transcription', async () => {
      const transcription = 'Follow up with client next week about pricing.';
      
      const actionItems = await service.extractActionItems(transcription);
      
      expect(Array.isArray(actionItems)).toBe(true);
      actionItems.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('text');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('priority');
      });
    });
  });
});
```

### Memory Storage Test Template
```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  saveAnalysis,
  getAnalysisByUserId,
  saveUpload,
  getUploadsByUserId
} from './memory-storage';

// Mock file system operations
jest.mock('fs/promises');
jest.mock('path');

describe('Memory Storage', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...args) => args.join('/'));
  });

  describe('saveAnalysis', () => {
    it('should save analysis to file', async () => {
      const analysis = {
        id: 'test-analysis',
        userId: 'test-user',
        status: 'completed' as const,
        result: { overallScore: 8.5, parameters: [] }
      };

      mockFs.readFile.mockResolvedValue('[]');
      mockFs.writeFile.mockResolvedValue();

      await saveAnalysis(analysis);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('analyses.json'),
        expect.stringContaining(analysis.id)
      );
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue();

      const analysis = {
        id: 'test-analysis',
        userId: 'test-user',
        status: 'completed' as const
      };

      await expect(saveAnalysis(analysis)).resolves.not.toThrow();
    });
  });

  describe('getAnalysisByUserId', () => {
    it('should return user analyses', async () => {
      const mockAnalyses = [
        { id: 'analysis-1', userId: 'test-user' },
        { id: 'analysis-2', userId: 'other-user' },
        { id: 'analysis-3', userId: 'test-user' }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockAnalyses));

      const result = await getAnalysisByUserId('test-user');

      expect(result).toHaveLength(2);
      expect(result.every(a => a.userId === 'test-user')).toBe(true);
    });

    it('should return empty array when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));

      const result = await getAnalysisByUserId('test-user');

      expect(result).toEqual([]);
    });
  });
});
```

## Feature Flag Integration Template
```typescript
// Feature flags configuration
interface FeatureFlags {
  chatbotEnabled: boolean;
  paymentIntegration: boolean;
  socialLogin: boolean;
  advancedAnalytics: boolean;
}

// Feature flag usage in components
const FeatureComponent = () => {
  const featureFlags = useFeatureFlags();
  
  if (!featureFlags.chatbotEnabled) {
    return null; // Feature disabled
  }
  
  return (
    <div>
      {/* Feature implementation */}
    </div>
  );
};

// Environment-specific feature flags
const getFeatureFlags = (): FeatureFlags => {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') {
    return require('../config/feature-flags.prod.json');
  } else if (env === 'staging') {
    return require('../config/feature-flags.staging.json');
  } else {
    return require('../config/feature-flags.dev.json');
  }
};
```

## Internationalization Template
```typescript
// Language configuration
interface Language {
  code: string;
  name: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' }
];

// Translation hook
const useTranslation = (namespace?: string) => {
  const { language } = useLanguage();
  
  const t = useCallback((key: string, params?: Record<string, string>) => {
    const translation = getTranslation(language, namespace, key);
    return interpolateParams(translation, params);
  }, [language, namespace]);
  
  return { t, language };
};

// Language switching
const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      className="border rounded px-2 py-1"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
};
```

## Authentication Template
```typescript
// JWT Authentication hook
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const login = async (credentials: LoginCredentials) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return { success: true };
    }
    
    return { success: false, error: data.error };
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  return { user, isLoading, login, logout };
};

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// API route with JWT verification
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authorization token required'
      }, { status: 401 });
    }
    
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = (payload as any).userId;
    
    // Implementation with authenticated user
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return NextResponse.json({
        success: false,
        error: 'Token expired'
      }, { status: 401 });
    }
    
    console.error('[API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

## Rate Limiting Template
```typescript
// Rate limiter implementation
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

// Rate limiting middleware
export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({
      success: false,
      error: 'Rate limit exceeded'
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      }
    });
  }
  
  return null; // Continue processing
}

// Usage in API route
export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Continue with normal processing
}
```

## Health Check Template
```typescript
// Health check endpoint
export async function GET() {
  try {
    const checks = await Promise.allSettled([
      // Database connectivity
      checkDatabase(),
      // External APIs
      checkGeminiAPI(),
      // File system
      checkFileSystem(),
      // Redis/Cache
      checkCache(),
    ]);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version,
      checks: {
        database: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        geminiAPI: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        fileSystem: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        cache: checks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      }
    };
    
    const hasUnhealthy = Object.values(health.checks).includes('unhealthy');
    
    return NextResponse.json(health, {
      status: hasUnhealthy ? 503 : 200
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 503 });
  }
}

async function checkDatabase() {
  // Database health check implementation
}

async function checkGeminiAPI() {
  // Gemini API health check implementation
}

async function checkFileSystem() {
  // File system health check implementation
}

async function checkCache() {
  // Cache health check implementation
}
```
