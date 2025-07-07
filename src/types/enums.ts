/**
 * Enums for consistent status handling across the application
 */

// ============================================================================
// Analysis Status Enum
// ============================================================================

export enum AnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING', 
  TRANSCRIBING = 'TRANSCRIBING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// ============================================================================
// Analysis Type Enum
// ============================================================================

export enum AnalysisType {
  DEFAULT = 'default',
  CUSTOM = 'custom',
  PARAMETERS = 'parameters'
}

// ============================================================================
// Sentiment Enum
// ============================================================================

export enum SentimentType {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  MIXED = 'mixed'
}

// ============================================================================
// Tone Enum
// ============================================================================

export enum ToneType {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  AGGRESSIVE = 'aggressive',
  UNCERTAIN = 'uncertain',
  CONFIDENT = 'confident',
  FRUSTRATED = 'frustrated',
  ENTHUSIASTIC = 'enthusiastic',
  CALM = 'calm',
  NEUTRAL = 'neutral'
}

// ============================================================================
// Confidence Level Enum
// ============================================================================

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ============================================================================
// Engagement Level Enum
// ============================================================================

export enum EngagementLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

// ============================================================================
// File Status Enum
// ============================================================================

export enum FileStatus {
  PENDING = 'pending',
  COMPRESSING = 'compressing',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// ============================================================================
// Utility functions for status checking
// ============================================================================

/**
 * Check if analysis status is completed (handles both cases)
 */
export function isAnalysisCompleted(status: string | undefined): boolean {
  if (!status) return false;
  return status.toUpperCase() === AnalysisStatus.COMPLETED;
}

/**
 * Check if analysis status is processing (handles both cases)
 */
export function isAnalysisProcessing(status: string | undefined): boolean {
  if (!status) return false;
  return status.toUpperCase() === AnalysisStatus.PROCESSING;
}

/**
 * Check if analysis status is pending (handles both cases)
 */
export function isAnalysisPending(status: string | undefined): boolean {
  if (!status) return false;
  return status.toUpperCase() === AnalysisStatus.PENDING;
}

/**
 * Check if analysis status is failed (handles both cases)
 */
export function isAnalysisFailed(status: string | undefined): boolean {
  if (!status) return false;
  return status.toUpperCase() === AnalysisStatus.FAILED;
}

/**
 * Check if analysis is in progress (pending, processing, transcribing, or analyzing)
 */
export function isAnalysisInProgress(status: string | undefined): boolean {
  if (!status) return false;
  const upperStatus = status.toUpperCase();
  return upperStatus === AnalysisStatus.PENDING || 
         upperStatus === AnalysisStatus.PROCESSING || 
         upperStatus === AnalysisStatus.TRANSCRIBING || 
         upperStatus === AnalysisStatus.ANALYZING;
}

/**
 * Check if analysis is finished (completed or failed)
 */
export function isAnalysisFinished(status: string | undefined): boolean {
  return isAnalysisCompleted(status) || isAnalysisFailed(status);
}

/**
 * Normalize status to uppercase enum value
 */
export function normalizeAnalysisStatus(status: string | undefined): AnalysisStatus | null {
  if (!status) return null;
  
  const upperStatus = status.toUpperCase();
  if (Object.values(AnalysisStatus).includes(upperStatus as AnalysisStatus)) {
    return upperStatus as AnalysisStatus;
  }
  
  return null;
}

/**
 * Get display name for analysis status
 */
export function getAnalysisStatusDisplayName(status: string | undefined): string {
  if (!status) return 'Unknown';
  
  const normalizedStatus = normalizeAnalysisStatus(status);
  if (!normalizedStatus) return 'Unknown';
  
  switch (normalizedStatus) {
    case AnalysisStatus.PENDING:
      return 'Pending';
    case AnalysisStatus.PROCESSING:
      return 'Processing';
    case AnalysisStatus.TRANSCRIBING:
      return 'Transcribing';
    case AnalysisStatus.ANALYZING:
      return 'Analyzing';
    case AnalysisStatus.COMPLETED:
      return 'Completed';
    case AnalysisStatus.FAILED:
      return 'Failed';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color classes for UI
 */
export function getAnalysisStatusColorClasses(status: string | undefined): string {
  const normalizedStatus = normalizeAnalysisStatus(status);
  if (!normalizedStatus) return 'text-gray-600 bg-gray-50';
  
  switch (normalizedStatus) {
    case AnalysisStatus.COMPLETED:
      return 'text-green-600 bg-green-50';
    case AnalysisStatus.PROCESSING:
    case AnalysisStatus.TRANSCRIBING:
    case AnalysisStatus.ANALYZING:
      return 'text-blue-600 bg-blue-50';
    case AnalysisStatus.FAILED:
      return 'text-red-600 bg-red-50';
    case AnalysisStatus.PENDING:
    default:
      return 'text-yellow-600 bg-yellow-50';
  }
}

/**
 * Get status icon for UI
 */
export function getAnalysisStatusIcon(status: string | undefined): string {
  const normalizedStatus = normalizeAnalysisStatus(status);
  if (!normalizedStatus) return '○';
  
  switch (normalizedStatus) {
    case AnalysisStatus.COMPLETED:
      return '✓';
    case AnalysisStatus.PROCESSING:
    case AnalysisStatus.TRANSCRIBING:
    case AnalysisStatus.ANALYZING:
      return '⟳';
    case AnalysisStatus.FAILED:
      return '✗';
    case AnalysisStatus.PENDING:
    default:
      return '○';
  }
}
