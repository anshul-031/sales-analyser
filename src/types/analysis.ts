/**
 * TypeScript interfaces for analysis-related objects in the Sales Analyser application
 */

import { 
  AnalysisStatus, 
  AnalysisType, 
  SentimentType, 
  ToneType, 
  ConfidenceLevel, 
  EngagementLevel 
} from './enums';

// ============================================================================
// Base Analysis Types
// ============================================================================

// ============================================================================
// Transcription Related Types
// ============================================================================

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

export interface SpeakerProfile {
  dominant_sentiment: SentimentType;
  dominant_tone: ToneType;
  engagement_level: EngagementLevel;
  communication_style: string;
}

export interface ConversationSummary {
  overall_sentiment: SentimentType;
  dominant_tones: ToneType[];
  speaker_profiles: { [speaker: string]: SpeakerProfile };
}

export interface ParsedTranscription {
  original_language: string;
  diarized_transcription: TranscriptionSegment[];
  english_translation?: TranscriptionSegment[];
  conversation_summary?: ConversationSummary;
}

export interface SpeakerSentiment {
  speaker: string;
  sentiment: SentimentType;
}

export interface SpeakerTone {
  speaker: string;
  tone: ToneType;
}

// ============================================================================
// Analysis Parameter Types
// ============================================================================

export interface AnalysisParameter {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}

export interface ParameterAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  specific_examples: string[];
  recommendations: string[];
}

export interface DefaultAnalysisResult {
  type: 'default';
  overallScore: number;
  analysisDate: string;
  parameters: { [parameterId: string]: ParameterAnalysisResult };
}

export interface CustomAnalysisResult {
  type: 'custom';
  result: string | any;
  metadata?: {
    recordingCount: number;
    prompt: string;
    timestamp: string;
  };
}

export interface ParametersAnalysisResult {
  type: 'parameters';
  overallScore: number;
  analysisDate: string;
  parameters: { [parameterId: string]: ParameterAnalysisResult };
}

export type AnalysisResultData = DefaultAnalysisResult | CustomAnalysisResult | ParametersAnalysisResult;

// Legacy analysis result format (for backward compatibility)
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

// Helper type for results that have overall score
export type ScoredAnalysisResult = DefaultAnalysisResult | ParametersAnalysisResult;

// Type guard functions
export function hasOverallScore(result: AnalysisResultData): result is ScoredAnalysisResult {
  return result.type === 'default' || result.type === 'parameters';
}

export function isCustomAnalysis(result: AnalysisResultData): result is CustomAnalysisResult {
  return result.type === 'custom';
}

// ============================================================================
// Call Metrics Types
// ============================================================================

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

// ============================================================================
// Insights Types
// ============================================================================

export interface AnalysisInsight {
  analysisId: string;
  category: 'summary' | 'sentiment' | 'keywords' | 'action_items' | 'participants' | 'emotions' | 'topics';
  key: string;
  value: any;
  confidence?: number;
}

// ============================================================================
// Main Analysis Entity
// ============================================================================

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

// ============================================================================
// Upload Related Types
// ============================================================================

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
  // For optimized API responses
  latestAnalysis?: {
    id: string;
    status: AnalysisStatus;
    analysisType: string;
    createdAt: string;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

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

// ============================================================================
// Component Props Types
// ============================================================================

export interface AnalysisDisplayProps {
  analysisResult: AnalysisResultData | any;
  isNested?: boolean;
}

export interface AnalysisResultsProps {
  userId: string;
  analysisIds: string[];
  onRefresh?: () => void;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface TimeFilter {
  label: string;
  value: string;
  days: number;
}

export interface AnalysisUIResult {
  query: string;
  result: string;
  recordingCount: number;
  timestamp: string;
}

export interface ChatMessage {
  type: 'user' | 'assistant';
  message: string;
  timestamp: Date;
}

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

// ============================================================================
// Color Scheme Types (for UI components)
// ============================================================================

export interface ColorScheme {
  bg: string;
  border: string;
  icon: string;
}

export interface StyleClasses {
  color: string;
  bg: string;
}

// ============================================================================
// Export all types for easy importing
// ============================================================================
