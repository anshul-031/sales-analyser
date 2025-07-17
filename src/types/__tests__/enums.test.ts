import {
  AnalysisStatus,
  AnalysisType,
  SentimentType,
  ToneType,
  isAnalysisCompleted,
  isAnalysisProcessing,
  isAnalysisPending,
  isAnalysisFailed,
  isAnalysisInProgress,
  isAnalysisFinished,
  normalizeAnalysisStatus,
  getAnalysisStatusDisplayName,
  getAnalysisStatusColorClasses,
  getAnalysisStatusIcon
} from '../enums';

describe('enums', () => {
  describe('Enum values', () => {
    it('should have correct AnalysisStatus values', () => {
      expect(AnalysisStatus.PENDING).toBe('PENDING');
      expect(AnalysisStatus.PROCESSING).toBe('PROCESSING');
      expect(AnalysisStatus.TRANSCRIBING).toBe('TRANSCRIBING');
      expect(AnalysisStatus.ANALYZING).toBe('ANALYZING');
      expect(AnalysisStatus.COMPLETED).toBe('COMPLETED');
      expect(AnalysisStatus.FAILED).toBe('FAILED');
    });

    it('should have correct AnalysisType values', () => {
      expect(AnalysisType.DEFAULT).toBe('default');
      expect(AnalysisType.CUSTOM).toBe('custom');
      expect(AnalysisType.PARAMETERS).toBe('parameters');
    });

    it('should have correct SentimentType values', () => {
      expect(SentimentType.POSITIVE).toBe('positive');
      expect(SentimentType.NEGATIVE).toBe('negative');
      expect(SentimentType.NEUTRAL).toBe('neutral');
      expect(SentimentType.MIXED).toBe('mixed');
    });

    it('should have correct ToneType values', () => {
      expect(ToneType.PROFESSIONAL).toBe('professional');
      expect(ToneType.FRIENDLY).toBe('friendly');
      expect(ToneType.AGGRESSIVE).toBe('aggressive');
      expect(ToneType.UNCERTAIN).toBe('uncertain');
      expect(ToneType.CONFIDENT).toBe('confident');
      expect(ToneType.FRUSTRATED).toBe('frustrated');
      expect(ToneType.ENTHUSIASTIC).toBe('enthusiastic');
    });
  });

  describe('isAnalysisCompleted', () => {
    it('should return true for completed status', () => {
      expect(isAnalysisCompleted('COMPLETED')).toBe(true);
      expect(isAnalysisCompleted('completed')).toBe(true);
      expect(isAnalysisCompleted('Completed')).toBe(true);
    });

    it('should return false for non-completed status', () => {
      expect(isAnalysisCompleted('PENDING')).toBe(false);
      expect(isAnalysisCompleted('PROCESSING')).toBe(false);
      expect(isAnalysisCompleted('FAILED')).toBe(false);
      expect(isAnalysisCompleted('INVALID')).toBe(false);
    });

    it('should return false for undefined/null status', () => {
      expect(isAnalysisCompleted(undefined)).toBe(false);
      expect(isAnalysisCompleted('')).toBe(false);
    });
  });

  describe('isAnalysisProcessing', () => {
    it('should return true for processing status', () => {
      expect(isAnalysisProcessing('PROCESSING')).toBe(true);
      expect(isAnalysisProcessing('processing')).toBe(true);
      expect(isAnalysisProcessing('Processing')).toBe(true);
    });

    it('should return false for non-processing status', () => {
      expect(isAnalysisProcessing('PENDING')).toBe(false);
      expect(isAnalysisProcessing('COMPLETED')).toBe(false);
      expect(isAnalysisProcessing('FAILED')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isAnalysisProcessing(undefined)).toBe(false);
      expect(isAnalysisProcessing('')).toBe(false);
    });
  });

  describe('isAnalysisPending', () => {
    it('should return true for pending status', () => {
      expect(isAnalysisPending('PENDING')).toBe(true);
      expect(isAnalysisPending('pending')).toBe(true);
      expect(isAnalysisPending('Pending')).toBe(true);
    });

    it('should return false for non-pending status', () => {
      expect(isAnalysisPending('PROCESSING')).toBe(false);
      expect(isAnalysisPending('COMPLETED')).toBe(false);
      expect(isAnalysisPending('FAILED')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isAnalysisPending(undefined)).toBe(false);
      expect(isAnalysisPending('')).toBe(false);
    });
  });

  describe('isAnalysisFailed', () => {
    it('should return true for failed status', () => {
      expect(isAnalysisFailed('FAILED')).toBe(true);
      expect(isAnalysisFailed('failed')).toBe(true);
      expect(isAnalysisFailed('Failed')).toBe(true);
    });

    it('should return false for non-failed status', () => {
      expect(isAnalysisFailed('PENDING')).toBe(false);
      expect(isAnalysisFailed('PROCESSING')).toBe(false);
      expect(isAnalysisFailed('COMPLETED')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isAnalysisFailed(undefined)).toBe(false);
      expect(isAnalysisFailed('')).toBe(false);
    });
  });

  describe('isAnalysisInProgress', () => {
    it('should return true for in-progress statuses', () => {
      expect(isAnalysisInProgress('PENDING')).toBe(true);
      expect(isAnalysisInProgress('PROCESSING')).toBe(true);
      expect(isAnalysisInProgress('TRANSCRIBING')).toBe(true);
      expect(isAnalysisInProgress('ANALYZING')).toBe(true);
      
      // Case insensitive
      expect(isAnalysisInProgress('pending')).toBe(true);
      expect(isAnalysisInProgress('processing')).toBe(true);
    });

    it('should return false for finished statuses', () => {
      expect(isAnalysisInProgress('COMPLETED')).toBe(false);
      expect(isAnalysisInProgress('FAILED')).toBe(false);
      expect(isAnalysisInProgress('INVALID')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isAnalysisInProgress(undefined)).toBe(false);
      expect(isAnalysisInProgress('')).toBe(false);
    });
  });

  describe('isAnalysisFinished', () => {
    it('should return true for finished statuses', () => {
      expect(isAnalysisFinished('COMPLETED')).toBe(true);
      expect(isAnalysisFinished('FAILED')).toBe(true);
      expect(isAnalysisFinished('completed')).toBe(true);
      expect(isAnalysisFinished('failed')).toBe(true);
    });

    it('should return false for in-progress statuses', () => {
      expect(isAnalysisFinished('PENDING')).toBe(false);
      expect(isAnalysisFinished('PROCESSING')).toBe(false);
      expect(isAnalysisFinished('TRANSCRIBING')).toBe(false);
      expect(isAnalysisFinished('ANALYZING')).toBe(false);
    });

    it('should return false for undefined status', () => {
      expect(isAnalysisFinished(undefined)).toBe(false);
      expect(isAnalysisFinished('')).toBe(false);
    });
  });

  describe('normalizeAnalysisStatus', () => {
    it('should normalize valid statuses to uppercase enum values', () => {
      expect(normalizeAnalysisStatus('pending')).toBe(AnalysisStatus.PENDING);
      expect(normalizeAnalysisStatus('PENDING')).toBe(AnalysisStatus.PENDING);
      expect(normalizeAnalysisStatus('Pending')).toBe(AnalysisStatus.PENDING);
      
      expect(normalizeAnalysisStatus('processing')).toBe(AnalysisStatus.PROCESSING);
      expect(normalizeAnalysisStatus('completed')).toBe(AnalysisStatus.COMPLETED);
      expect(normalizeAnalysisStatus('failed')).toBe(AnalysisStatus.FAILED);
      expect(normalizeAnalysisStatus('transcribing')).toBe(AnalysisStatus.TRANSCRIBING);
      expect(normalizeAnalysisStatus('analyzing')).toBe(AnalysisStatus.ANALYZING);
    });

    it('should return null for invalid statuses', () => {
      expect(normalizeAnalysisStatus('INVALID')).toBe(null);
      expect(normalizeAnalysisStatus('random')).toBe(null);
      expect(normalizeAnalysisStatus('123')).toBe(null);
    });

    it('should return null for undefined/empty status', () => {
      expect(normalizeAnalysisStatus(undefined)).toBe(null);
      expect(normalizeAnalysisStatus('')).toBe(null);
    });
  });

  describe('getAnalysisStatusDisplayName', () => {
    it('should return proper display names for valid statuses', () => {
      expect(getAnalysisStatusDisplayName('PENDING')).toBe('Pending');
      expect(getAnalysisStatusDisplayName('PROCESSING')).toBe('Processing');
      expect(getAnalysisStatusDisplayName('TRANSCRIBING')).toBe('Transcribing');
      expect(getAnalysisStatusDisplayName('ANALYZING')).toBe('Analyzing');
      expect(getAnalysisStatusDisplayName('COMPLETED')).toBe('Completed');
      expect(getAnalysisStatusDisplayName('FAILED')).toBe('Failed');
      
      // Case insensitive
      expect(getAnalysisStatusDisplayName('pending')).toBe('Pending');
      expect(getAnalysisStatusDisplayName('completed')).toBe('Completed');
    });

    it('should return "Unknown" for invalid statuses', () => {
      expect(getAnalysisStatusDisplayName('INVALID')).toBe('Unknown');
      expect(getAnalysisStatusDisplayName('random')).toBe('Unknown');
      expect(getAnalysisStatusDisplayName(undefined)).toBe('Unknown');
      expect(getAnalysisStatusDisplayName('')).toBe('Unknown');
    });
  });

  describe('getAnalysisStatusColorClasses', () => {
    it('should return appropriate color classes for each status', () => {
      expect(getAnalysisStatusColorClasses('PENDING')).toContain('text-yellow');
      expect(getAnalysisStatusColorClasses('PROCESSING')).toContain('text-blue');
      expect(getAnalysisStatusColorClasses('TRANSCRIBING')).toContain('text-blue');
      expect(getAnalysisStatusColorClasses('ANALYZING')).toContain('text-blue');
      expect(getAnalysisStatusColorClasses('COMPLETED')).toContain('text-green');
      expect(getAnalysisStatusColorClasses('FAILED')).toContain('text-red');
      
      // Case insensitive
      expect(getAnalysisStatusColorClasses('pending')).toContain('text-yellow');
      expect(getAnalysisStatusColorClasses('completed')).toContain('text-green');
    });

    it('should return default color for invalid status', () => {
      expect(getAnalysisStatusColorClasses('INVALID')).toContain('text-gray');
      expect(getAnalysisStatusColorClasses(undefined)).toContain('text-gray');
      expect(getAnalysisStatusColorClasses('')).toContain('text-gray');
    });
  });

  describe('getAnalysisStatusIcon', () => {
    it('should return appropriate icons for each status', () => {
      expect(getAnalysisStatusIcon('PENDING')).toBe('○');
      expect(getAnalysisStatusIcon('PROCESSING')).toBe('⟳');
      expect(getAnalysisStatusIcon('TRANSCRIBING')).toBe('⟳');
      expect(getAnalysisStatusIcon('ANALYZING')).toBe('⟳');
      expect(getAnalysisStatusIcon('COMPLETED')).toBe('✓');
      expect(getAnalysisStatusIcon('FAILED')).toBe('✗');
      
      // Case insensitive
      expect(getAnalysisStatusIcon('pending')).toBe('○');
      expect(getAnalysisStatusIcon('completed')).toBe('✓');
    });

    it('should return default icon for invalid status', () => {
      expect(getAnalysisStatusIcon('INVALID')).toBe('○');
      expect(getAnalysisStatusIcon(undefined)).toBe('○');
      expect(getAnalysisStatusIcon('')).toBe('○');
    });
  });
});
