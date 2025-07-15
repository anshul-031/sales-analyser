# AI Call Performance Analyzer - Copilot Context

## Project Context for GitHub Copilot

This file provides additional context to help GitHub Copilot understand the AI Call Performance Analyzer project better.

### Project Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── analyze/          # Analysis endpoints
│   │   ├── upload/           # File upload endpoints
│   │   ├── chatbot/          # AI chatbot endpoints
│   │   └── cleanup/          # File cleanup endpoints
│   ├── call-history/         # Call history page
│   ├── analytics/            # Analytics dashboard
│   └── globals.css           # Global styles
├── components/               # React components
│   ├── Chatbot.tsx          # AI chatbot component
│   ├── FileUpload.tsx       # File upload component
│   ├── AnalysisResults.tsx  # Analysis display component
│   └── Navigation.tsx       # Navigation component
└── lib/                     # Utilities and services
    ├── gemini.ts            # Google Gemini AI service
    ├── memory-storage.ts    # File-based storage
    └── constants.ts         # Application constants
```

### Key Dependencies
- Next.js 15.3.3 with App Router
- Google Gemini AI (@google/generative-ai)
- Tailwind CSS for styling
- Lucide React for icons
- React Dropzone for file uploads

### Important Constants

```typescript
// Demo user for development
export const DEMO_USER_ID = 'demo-user-123';

// Supported audio formats
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',      // MP3
  'audio/wav',       // WAV
  'audio/mp4',       // M4A
  'audio/aac',       // AAC
  'audio/ogg',       // OGG
  'audio/flac',      // FLAC
  'audio/webm'       // WebM
];

// Analysis types
export const ANALYSIS_TYPES = {
  DEFAULT: 'default',
  PARAMETERS: 'parameters', 
  CUSTOM: 'custom'
};
```

### Storage Schema

#### Upload Object
```typescript
interface Upload {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  userId: string;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
}
```

#### Analysis Object
```typescript
interface Analysis {
  id: string;
  uploadIds: string[];
  userId: string;
  analysisType: 'default' | 'parameters' | 'custom';
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: {
    transcription?: string;
    overallScore: number;
    parameters: Array<{
      name: string;
      score: number;
      strengths: string[];
      improvements: string[];
    }>;
  };
  createdAt: string;
  completedAt?: string;
}
```

### Common Patterns

#### API Response Format
All API endpoints follow this consistent format:
```typescript
// Success response
{
  success: true,
  data: any
}

// Error response
{
  success: false,
  error: string
}
```

#### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('[Component/API] Error:', error);
  // Handle error appropriately
}
```

#### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### AI Integration Patterns

#### Gemini Service Usage
```typescript
import { GeminiAnalysisService } from '@/lib/gemini';

const geminiService = new GeminiAnalysisService();
const result = await geminiService.analyzeWithDefaultParameters(transcription);
```

#### Analysis Pipeline
1. File Upload → Storage
2. Audio Transcription → Gemini API
3. Performance Analysis → Gemini API
4. Result Storage → JSON files
5. UI Updates → Real-time status

### Environment Variables
```env
GOOGLE_GEMINI_API_KEYS=["key1", "key2"]  # Multiple keys for rate limiting
AUTO_DELETE_FILES=true                    # Auto cleanup after analysis
MAX_FILE_SIZE=5242880                     # 5MB file size limit
```

### Testing Patterns
- Use Postman collection for API testing
- Mock Gemini API calls in tests
- Test file upload/download flows
- Validate error handling scenarios

This context helps Copilot understand the project structure, patterns, and best practices specific to this AI call analysis application.
