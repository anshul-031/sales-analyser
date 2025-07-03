# TypeScript Interfaces Documentation

This document describes the comprehensive TypeScript interfaces created for the Sales Analyser application to ensure type safety and better code organization.

## Overview

The application now uses strongly-typed interfaces for all analysis-related objects, transcription data, and API responses. All types are centralized in the `/src/types/` directory.

## Core Type Categories

### 1. Analysis Status and Types

```typescript
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalysisType = 'default' | 'custom' | 'parameters';
```

### 2. Sentiment and Tone Analysis

```typescript
export type SentimentType = 'positive' | 'negative' | 'neutral' | 'mixed';
export type ToneType = 'professional' | 'friendly' | 'aggressive' | 'uncertain' 
  | 'confident' | 'frustrated' | 'enthusiastic' | 'calm' | 'neutral';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type EngagementLevel = 'low' | 'medium' | 'high';
```

## Main Interface Categories

### 1. Transcription Interfaces

#### TranscriptionSegment
Represents a single segment of transcribed audio with enhanced metadata:

```typescript
export interface TranscriptionSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
  tone?: ToneType;
  sentiment?: SentimentType;
  confidence_level?: ConfidenceLevel;
  timestamp?: string; // For legacy compatibility
}
```

#### ParsedTranscription
Complete transcription structure with conversation analysis:

```typescript
export interface ParsedTranscription {
  original_language: string;
  diarized_transcription: TranscriptionSegment[];
  english_translation?: TranscriptionSegment[];
  conversation_summary?: ConversationSummary;
}
```

#### ConversationSummary
Overall conversation insights and speaker profiles:

```typescript
export interface ConversationSummary {
  overall_sentiment: SentimentType;
  dominant_tones: ToneType[];
  speaker_profiles: { [speaker: string]: SpeakerProfile };
}
```

### 2. Analysis Parameter Interfaces

#### AnalysisParameter
Configuration for custom analysis parameters:

```typescript
export interface AnalysisParameter {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}
```

#### ParameterAnalysisResult
Individual parameter analysis results:

```typescript
export interface ParameterAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  specific_examples: string[];
  recommendations: string[];
}
```

### 3. Analysis Result Types

The application supports three types of analysis results:

#### DefaultAnalysisResult
Standard sales analysis framework:

```typescript
export interface DefaultAnalysisResult {
  type: 'default';
  overallScore: number;
  analysisDate: string;
  parameters: { [parameterId: string]: ParameterAnalysisResult };
}
```

#### CustomAnalysisResult
Free-form analysis with custom prompts:

```typescript
export interface CustomAnalysisResult {
  type: 'custom';
  result: string | any;
  metadata?: {
    recordingCount: number;
    prompt: string;
    timestamp: string;
  };
}
```

#### ParametersAnalysisResult
Analysis using custom parameters:

```typescript
export interface ParametersAnalysisResult {
  type: 'parameters';
  overallScore: number;
  analysisDate: string;
  parameters: { [parameterId: string]: ParameterAnalysisResult };
}
```

### 4. Main Entity Interfaces

#### Analysis
Complete analysis entity:

```typescript
export interface Analysis {
  id: string;
  status: AnalysisStatus;
  analysisType: AnalysisType;
  customPrompt?: string;
  customParameters?: AnalysisParameter[];
  transcription?: string;
  analysisResult?: AnalysisResultData;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  analysisDuration?: number;
  userId: string;
  uploadId: string;
  upload?: {
    id: string;
    originalName: string;
    fileSize: number;
    uploadedAt: string;
    filename?: string;
    mimeType?: string;
  } | null;
  insights?: AnalysisInsight[];
  callMetrics?: CallMetrics;
}
```

#### Upload
File upload entity:

```typescript
export interface Upload {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedAt: string;
  userId: string;
  analyses?: Analysis[];
}
```

#### CallRecording
Extended interface for call recordings with analysis data:

```typescript
export interface CallRecording {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  fileUrl?: string;
  uploadedAt: string;
  userId?: string;
  analyses?: Array<{
    id: string;
    status: AnalysisStatus;
    transcription?: string | ParsedTranscription;
    analysisResult?: AnalysisResultData;
    createdAt: string;
    insights?: AnalysisInsight[];
    callMetrics?: CallMetrics;
  }>;
}
```

### 5. API Request/Response Types

#### Analysis API
```typescript
export interface AnalyzeRequest {
  uploadIds: string[];
  analysisType: AnalysisType;
  customPrompt?: string;
  customParameters?: AnalysisParameter[];
}

export interface AnalyzeResponse {
  success: boolean;
  analysisId?: string;
  result?: AnalysisResultData;
  message?: string;
  error?: string;
}
```

#### Custom Analysis API
```typescript
export interface CustomAnalysisRequest {
  transcription: string;
  customPrompt: string;
  recordingIds?: string[];
}

export interface CustomAnalysisResponse {
  success: boolean;
  analysis?: string;
  result?: string;
  recordingCount?: number;
  metadata?: {
    recordingCount: number;
    prompt: string;
    timestamp: string;
  };
  error?: string;
}
```

#### Chat API
```typescript
export interface ChatRequest {
  question: string;
  analysisId?: string;
  uploadId?: string;
}

export interface ChatResponse {
  success: boolean;
  answer?: string;
  context?: {
    analysisCount: number;
    uploadCount: number;
    keyInsights: string[];
  };
  error?: string;
}
```

### 6. Supporting Types

#### Call Metrics
Performance metrics for calls:

```typescript
export interface CallMetrics {
  analysisId: string;
  duration?: number;
  participantCount?: number;
  wordCount?: number;
  sentimentScore?: number;
  energyLevel?: number;
  talkRatio?: number;
  interruptionCount?: number;
  pauseCount?: number;
  speakingPace?: number;
}
```

#### Analysis Insights
Categorized insights from analysis:

```typescript
export interface AnalysisInsight {
  analysisId: string;
  category: 'summary' | 'sentiment' | 'keywords' | 'action_items' | 'participants' | 'emotions' | 'topics';
  key: string;
  value: any;
  confidence?: number;
}
```

## Utility Types and Functions

### Type Guards
Helper functions to check result types:

```typescript
export function hasOverallScore(result: AnalysisResultData): result is ScoredAnalysisResult;
export function isCustomAnalysis(result: AnalysisResultData): result is CustomAnalysisResult;
```

### Union Types
```typescript
export type AnalysisResultData = DefaultAnalysisResult | CustomAnalysisResult | ParametersAnalysisResult;
export type ScoredAnalysisResult = DefaultAnalysisResult | ParametersAnalysisResult;
```

### Legacy Compatibility
For backward compatibility with existing data:

```typescript
export interface LegacyAnalysisResult {
  sentiment_analysis?: SpeakerSentiment[];
  tone_analysis?: SpeakerTone[];
  speaker_mapping?: { [key: string]: string };
  customer_name?: string;
  parameters?: {
    sentiment_analysis?: SpeakerSentiment[];
    tone_analysis?: SpeakerTone[];
    speaker_mapping?: { [key: string]: string };
    customer_name?: string;
    [key: string]: any;
  };
  [key: string]: any;
}
```

## Component Props Types

### Component Interface Props
```typescript
export interface AnalysisDisplayProps {
  analysisResult: AnalysisResultData | any;
  isNested?: boolean;
}

export interface AnalysisResultsProps {
  userId: string;
  analysisIds: string[];
  onRefresh?: () => void;
}
```

## Usage Examples

### Importing Types
```typescript
import type { 
  Analysis, 
  AnalysisResultData, 
  CallRecording, 
  TranscriptionSegment,
  hasOverallScore 
} from '@/types';
```

### Type Guards Usage
```typescript
if (hasOverallScore(analysisResult)) {
  // TypeScript now knows this has an overallScore property
  console.log(`Score: ${analysisResult.overallScore}`);
}
```

### Component Props
```typescript
const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  analysisResult, 
  isNested = false 
}) => {
  // Component implementation
};
```

## Benefits

1. **Type Safety**: Prevents runtime errors by catching type mismatches at compile time
2. **Better IntelliSense**: Enhanced code completion and documentation in IDEs
3. **Refactoring Safety**: Changes to interfaces are automatically validated across the codebase
4. **Self-Documenting Code**: Types serve as documentation for data structures
5. **Legacy Compatibility**: Supports existing data while enforcing types for new code
6. **API Contract Enforcement**: Ensures API requests/responses match expected structure

## Migration Notes

- All existing components have been updated to use the new types
- Legacy data structures are supported through union types and optional properties
- Type guards are provided to safely check result types at runtime
- The `any` type is used sparingly only where legacy compatibility is required

## Files Modified

- `/src/types/analysis.ts` - New comprehensive type definitions
- `/src/types/index.ts` - Central export for all types
- `/src/components/AnalysisDisplay.tsx` - Updated to use typed interfaces
- `/src/components/AnalysisResults.tsx` - Updated to use typed interfaces
- `/src/app/call-history/page.tsx` - Updated to use typed interfaces
- `/src/app/call-analysis/page.tsx` - Updated to use typed interfaces

The type system is now comprehensive and provides full coverage for all analysis-related functionality while maintaining backward compatibility with existing data.
