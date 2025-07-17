import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CallAnalysisPage from '../page';

// Mock the auth context
const mockUser = { id: 'user-1', email: 'test@example.com' };
const mockAuthContext = {
  user: mockUser as any,
  loading: false,
};

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Mock Logger
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
  },
  isAnalysisCompleted: jest.fn((status) => status === 'completed'),
  isAnalysisFailed: jest.fn((status) => status === 'failed'),
}));

describe('CallAnalysisPage', () => {
  const mockPush = jest.fn();
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // Reset auth context
    mockAuthContext.user = mockUser as any;
    mockAuthContext.loading = false;
    
    // Mock successful uploads response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        uploads: [
          {
            id: '1',
            originalName: 'test-call-1.mp3',
            fileSize: 1024000,
            uploadedAt: '2023-01-01T10:00:00Z',
            mimeType: 'audio/mp3',
            analyses: [{
              id: 'analysis-1',
              status: 'completed',
              transcription: 'This is a test transcription for call 1.'
            }]
          },
          {
            id: '2',
            originalName: 'test-call-2.wav',
            fileSize: 2048000,
            uploadedAt: '2023-01-02T11:00:00Z',
            mimeType: 'audio/wav',
            analyses: [{
              id: 'analysis-2',
              status: 'completed',
              transcription: 'This is a test transcription for call 2.'
            }]
          }
        ],
        pagination: {
          page: 1,
          totalPages: 1,
          total: 2
        }
      }),
    } as any);
  });

  it('renders the call analysis page with header', async () => {
    render(<CallAnalysisPage />);
    
    expect(screen.getByText('Call Recording Analysis')).toBeInTheDocument();
    expect(screen.getByText('Analyze your call recordings with AI-powered insights and custom queries')).toBeInTheDocument();
  });

  it('loads and displays call recordings', async () => {
    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
      expect(screen.getByText('test-call-2.wav')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/uploads-optimized?page=1&limit=20');
  });

  it('handles time filter selection', async () => {
    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
    });

    const timeFilter = screen.getByDisplayValue('All Time');
    fireEvent.change(timeFilter, { target: { value: '7d' } });
    
    expect(timeFilter).toHaveValue('7d');
  });

  it('handles search functionality', async () => {
    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search recordings or transcriptions...');
    fireEvent.change(searchInput, { target: { value: 'test-call-1' } });
    
    expect(searchInput).toHaveValue('test-call-1');
  });

  it('handles recording selection', async () => {
    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const firstRecordingCheckbox = checkboxes.find(cb => 
      cb.closest('div')?.textContent?.includes('test-call-1.mp3')
    );
    
    if (firstRecordingCheckbox) {
      fireEvent.click(firstRecordingCheckbox);
      expect(firstRecordingCheckbox).toBeChecked();
    }
  });

  it('handles select all functionality', async () => {
    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
    });

    const selectAllButton = screen.getByText(/Select All/);
    fireEvent.click(selectAllButton);
    
    expect(screen.getByText(/2.*selected/)).toBeInTheDocument();
  });

  it('displays custom analysis panel', async () => {
    render(<CallAnalysisPage />);
    
    expect(screen.getByText('Custom Analysis')).toBeInTheDocument();
    expect(screen.getByText('Ask a question about selected recordings:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/What are the main pain points/)).toBeInTheDocument();
  });

  it('handles custom analysis submission', async () => {
    // Mock successful analysis response
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          uploads: [
            {
              id: '1',
              originalName: 'test-call-1.mp3',
              fileSize: 1024000,
              uploadedAt: '2023-01-01T10:00:00Z',
              mimeType: 'audio/mp3',
              analyses: [{
                id: 'analysis-1',
                status: 'completed',
                transcription: 'This is a test transcription for call 1.'
              }]
            }
          ],
          pagination: { page: 1, totalPages: 1, total: 1 }
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analysis: {
            transcription: 'Test transcription data'
          }
        }),
      } as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          analysis: 'Test analysis result'
        }),
      } as any);

    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('test-call-1.mp3')).toBeInTheDocument();
    });

    // Select a recording
    const checkboxes = screen.getAllByRole('checkbox');
    const firstRecordingCheckbox = checkboxes.find(cb => 
      cb.closest('div')?.textContent?.includes('test-call-1.mp3')
    );
    
    if (firstRecordingCheckbox) {
      fireEvent.click(firstRecordingCheckbox);
    }

    // Enter custom query
    const queryTextarea = screen.getByPlaceholderText(/What are the main pain points/);
    fireEvent.change(queryTextarea, { target: { value: 'What were the main topics discussed?' } });

    // Submit analysis
    const analyzeButton = screen.getByText('Analyze Selected Calls');
    fireEvent.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockAuthContext.loading = true;
    
    render(<CallAnalysisPage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
    
    render(<CallAnalysisPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('displays pagination controls when multiple pages exist', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        uploads: [
          {
            id: '1',
            originalName: 'test-call-1.mp3',
            fileSize: 1024000,
            uploadedAt: '2023-01-01T10:00:00Z',
            mimeType: 'audio/mp3',
            analyses: [{ id: 'analysis-1', status: 'completed' }]
          }
        ],
        pagination: {
          page: 1,
          totalPages: 3,
          total: 50
        }
      }),
    } as any);

    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });

  it('handles empty recordings state', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        uploads: [],
        pagination: { page: 1, totalPages: 0, total: 0 }
      }),
    } as any);

    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No call recordings found for the selected time period')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: 'Failed to load recordings'
      }),
    } as any);

    // Mock alert
    window.alert = jest.fn();

    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to load recordings: Failed to load recordings');
    });
  });

  it('displays analysis status indicators', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        uploads: [
          {
            id: '1',
            originalName: 'completed-call.mp3',
            fileSize: 1024000,
            uploadedAt: '2023-01-01T10:00:00Z',
            mimeType: 'audio/mp3',
            analyses: [{ id: 'analysis-1', status: 'completed' }]
          },
          {
            id: '2',
            originalName: 'failed-call.mp3',
            fileSize: 1024000,
            uploadedAt: '2023-01-01T10:00:00Z',
            mimeType: 'audio/mp3',
            analyses: [{ id: 'analysis-2', status: 'failed' }]
          }
        ],
        pagination: { page: 1, totalPages: 1, total: 2 }
      }),
    } as any);

    render(<CallAnalysisPage />);
    
    await waitFor(() => {
      expect(screen.getByText('completed-call.mp3')).toBeInTheDocument();
      expect(screen.getByText('failed-call.mp3')).toBeInTheDocument();
    });
  });
});
