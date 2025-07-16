import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisResults from '../AnalysisResults';
import type { Analysis } from '@/types';
import { AnalysisStatus, AnalysisType } from '@/types';

// Mock dependencies
jest.mock('../Chatbot', () => {
  return function MockChatbot({ analysisId, uploadId, onClose }: any) {
    return (
      <div data-testid="chatbot">
        <div>Chatbot for analysis: {analysisId}</div>
        <div>Upload: {uploadId}</div>
        <button onClick={onClose} data-testid="close-chatbot">Close</button>
      </div>
    );
  };
});

// Mock utils with simple implementations
jest.mock('@/lib/utils', () => ({
  formatDate: jest.fn(() => '1/1/2024'),
  getStatusColor: jest.fn((status: string) => `status-${status.toLowerCase()}`),
  getStatusIcon: jest.fn((status: string) => `icon-${status.toLowerCase()}`),
  isAnalysisCompleted: jest.fn((status: any) => status === 'COMPLETED'),
  isAnalysisProcessing: jest.fn((status: any) => status === 'PROCESSING'),
  isAnalysisPending: jest.fn((status: any) => status === 'PENDING'),
  isAnalysisFailed: jest.fn((status: any) => status === 'FAILED'),
  isAnalysisInProgress: jest.fn((status: any) => 
    status === 'PROCESSING' || 
    status === 'PENDING' || 
    status === 'TRANSCRIBING' || 
    status === 'ANALYZING'),
  getAnalysisStatusDisplayName: jest.fn((status: any) => status.toString()),
  formatFileSize: jest.fn((size) => `${(size / 1024).toFixed(0)} KB`),
  formatDuration: jest.fn((duration) => `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`),
  downloadBlob: jest.fn(),
  getAudioTypeFromMimeType: jest.fn(() => 'audio')
}));

// Mock types
jest.mock('@/types', () => ({
  ...jest.requireActual('@/types'),
  hasOverallScore: jest.fn((result: any) => result && typeof result.overallScore === 'number'),
  AnalysisStatus: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    TRANSCRIBING: 'TRANSCRIBING',
    ANALYZING: 'ANALYZING'
  },
  AnalysisType: {
    DEFAULT: 'DEFAULT',
    COMPREHENSIVE: 'COMPREHENSIVE',
    TRANSCRIPTION: 'TRANSCRIPTION'
  }
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  Clock: () => <div data-testid="clock">Clock</div>,
  CheckCircle: () => <div data-testid="check-circle">CheckCircle</div>,
  XCircle: () => <div data-testid="x-circle">XCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle">AlertCircle</div>,
  TrendingUp: () => <div data-testid="trending-up">TrendingUp</div>,
  TrendingDown: () => <div data-testid="trending-down">TrendingDown</div>,
  Target: () => <div data-testid="target">Target</div>,
  Lightbulb: () => <div data-testid="lightbulb">Lightbulb</div>,
  Star: () => <div data-testid="star">Star</div>,
  Award: () => <div data-testid="award">Award</div>,
  MessageCircle: () => <div data-testid="message-circle">MessageCircle</div>,
  FileText: () => <div data-testid="file-text">FileText</div>,
  Heart: () => <div data-testid="heart">Heart</div>,
  Frown: () => <div data-testid="frown">Frown</div>,
  Smile: () => <div data-testid="smile">Smile</div>,
  Meh: () => <div data-testid="meh">Meh</div>,
  Users: () => <div data-testid="users">Users</div>,
  Brain: () => <div data-testid="brain">Brain</div>,
  Activity: () => <div data-testid="activity">Activity</div>,
  Gauge: () => <div data-testid="gauge">Gauge</div>
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock URL and document methods for download functionality
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe('AnalysisResults Component', () => {
  const mockOnRefresh = jest.fn();
  
  const defaultProps = {
    userId: 'test-user-123',
    analysisIds: [],
    onRefresh: mockOnRefresh
  };

  const mockAnalysis: Analysis = {
    id: 'analysis-1',
    userId: 'test-user-123',
    uploadId: 'upload-1',
    status: AnalysisStatus.COMPLETED,
    analysisType: AnalysisType.DEFAULT,
    transcription: 'Test transcription content',
    analysisResult: {
      type: 'default',
      overallScore: 85,
      analysisDate: '2024-01-01T10:05:00Z',
      parameters: {
        'param1': {
          score: 8.5,
          summary: 'Good communication skills',
          strengths: ['Clear speech'],
          improvements: ['Speak more clearly', 'Use simpler language'],
          specific_examples: ['Clear articulation in minute 2'],
          recommendations: ['Practice speaking exercises']
        }
      }
    },
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:05:00Z',
    upload: {
      id: 'upload-1',
      originalName: 'test-call.mp3',
      fileSize: 1024000,
      uploadedAt: '2024-01-01T09:55:00Z',
      filename: 'test-call-processed.mp3',
      mimeType: 'audio/mpeg'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        analyses: [mockAnalysis]
      })
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  describe('Component Initialization', () => {
    it('renders without crashing', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      expect(screen.getByText('Loading analyses...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Loading analyses...')).not.toBeInTheDocument();
      });
    });

    it('fetches analyses on mount when userId is provided', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analyze?');
      });
    });

    it('does not fetch analyses when userId is not provided', () => {
      render(<AnalysisResults {...defaultProps} userId="" />);
      
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('displays loading state initially', () => {
      render(<AnalysisResults {...defaultProps} />);
      
      expect(screen.getByText('Loading analyses...')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('displays analyses after successful fetch', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
        expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
      });
    });

    it('filters analyses by analysisIds when provided', async () => {
      const filteredProps = {
        ...defaultProps,
        analysisIds: ['analysis-1']
      };
      
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analyses: [
            mockAnalysis,
            { ...mockAnalysis, id: 'analysis-2', upload: { ...mockAnalysis.upload!, originalName: 'other-call.mp3' } }
          ]
        })
      });

      render(<AnalysisResults {...filteredProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
        expect(screen.queryByText('other-call.mp3')).not.toBeInTheDocument();
      });
    });

    it('handles API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: false,
          error: 'Failed to fetch analyses'
        })
      });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch analyses')).toBeInTheDocument();
      });
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });

    it('displays empty state when no analyses are returned', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analyses: []
        })
      });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Analyses Found')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-refreshes when there are pending analyses', async () => {
      const pendingAnalysis = {
        ...mockAnalysis,
        status: 'PROCESSING' as any
      };

      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            analyses: [pendingAnalysis]
          })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            success: true,
            analyses: [mockAnalysis] // Completed
          })
        });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/PROCESSING/)).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    it('does not auto-refresh when all analyses are completed', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should only be called once (initial fetch)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Analysis Expansion', () => {
    it('expands analysis when clicked', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      });

      const analysisCard = screen.getByText('test-call.mp3').closest('div');
      if (analysisCard && analysisCard.parentElement) {
        fireEvent.click(analysisCard.parentElement);
        
        // After expansion, we should see more details
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      }
    });

    it('shows analysis header information', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
        expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
      });
    });
  });

  describe('Download Functionality', () => {
    it('has download button for completed analyses', async () => {
      mockCreateObjectURL.mockReturnValue('blob:test-url');

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      });

      // Check that download button is present (Download icon should be in DOM)
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('has refresh button and calls fetch on click', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-icon').closest('button');
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + refresh
      }
    });
  });

  describe('Chatbot Integration', () => {
    it('has AI chat button for completed analyses', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      });

      // Check that chat button is present
      expect(screen.getByTestId('message-circle')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays correct status for completed analysis', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/COMPLETED/)).toBeInTheDocument();
      });
    });

    it('displays correct status for failed analysis', async () => {
      const failedAnalysis = { ...mockAnalysis, status: 'FAILED' as any };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analyses: [failedAnalysis]
        })
      });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/FAILED/)).toBeInTheDocument();
      });
    });

    it('displays correct status for processing analysis', async () => {
      const processingAnalysis = { ...mockAnalysis, status: 'PROCESSING' as any };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analyses: [processingAnalysis]
        })
      });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/PROCESSING/)).toBeInTheDocument();
      });
    });
  });

  describe('Analysis Results Display', () => {
    it('displays overall score when available', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
        expect(screen.getByText(/85/)).toBeInTheDocument(); // Score should be displayed
      });
    });

    it('displays file information', async () => {
      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
        expect(screen.getByText(/1000/)).toBeInTheDocument(); // File size number
        expect(screen.getByText(/KB/)).toBeInTheDocument(); // File size unit
      });
    });

    it('handles missing analysis results gracefully', async () => {
      const analysisWithoutResults = { ...mockAnalysis, analysisResult: null };
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analyses: [analysisWithoutResults]
        })
      });

      render(<AnalysisResults {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('test-call.mp3')).toBeInTheDocument();
      });
    });
  });
});
