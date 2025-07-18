import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CallHistoryPage from '../page';

// Mock all dependencies with simple mocks
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user1', email: 'test@example.com', isEmailVerified: true },
    loading: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/call-history',
    query: {},
    asPath: '/call-history',
  }),
}));

jest.mock('@/components/AnalysisDisplay', () => {
  return function MockAnalysisDisplay() {
    return <div data-testid="analysis-display">Mock Analysis Display</div>;
  };
});

jest.mock('@/components/Chatbot', () => {
  return function MockChatbot() {
    return <div data-testid="chatbot">Mock Chatbot</div>;
  };
});

// Mock fetch globally to return empty recordings
(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      uploads: [],
      pagination: {
        page: 1,
        totalPages: 0,
        total: 0
      }
    }),
  })
);

describe('CallHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the call history page after loading', async () => {
    render(<CallHistoryPage />);
    
    // Wait for loading to complete and then check for Call History text
    await waitFor(() => {
      expect(screen.getByText('Call History')).toBeInTheDocument();
    });
  });

  it('should display no recordings message when empty', async () => {
    render(<CallHistoryPage />);
    
    // Wait for the API call to complete and empty state to show
    await waitFor(() => {
      expect(screen.getByText('No call recordings found.')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    render(<CallHistoryPage />);
    // The component should start with a loading state
    expect(screen.getByText('Loading Call History...')).toBeInTheDocument();
  });

  it('should have call history functionality', async () => {
    render(<CallHistoryPage />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Call History')).toBeInTheDocument();
    });
    
    // Check that the basic structure is present
    expect(screen.getByText('Select a recording to view its analysis.')).toBeInTheDocument();
  });

  it('should render with mocked dependencies', async () => {
    render(<CallHistoryPage />);
    
    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText('Call History')).toBeInTheDocument();
    });
    
    // The component should be rendered without errors
    expect(screen.getByText('Delete All')).toBeInTheDocument();
  });
});

describe('CallHistoryPage with data', () => {
  const mockRecordings = [
    {
      id: 'rec1',
      originalName: 'recording1.wav',
      mimeType: 'audio/wav',
      fileSize: 12345,
      uploadedAt: new Date('2023-10-26T10:00:00Z').toISOString(),
      analyses: [
        {
          id: 'anl1',
          status: 'completed',
          analysisResult: { summary: 'Test summary' },
          transcription: 'Test transcription',
        },
      ],
    },
    {
      id: 'rec2',
      originalName: 'recording2.mp3',
      mimeType: 'audio/mp3',
      fileSize: 67890,
      uploadedAt: new Date('2023-10-26T11:00:00Z').toISOString(),
      analyses: [
        {
          id: 'anl2',
          status: 'failed',
        },
      ],
    },
  ];

  beforeEach(() => {
    (global as any).fetch = jest.fn((url) => {
      if (url.toString().includes('uploads-optimized')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              uploads: mockRecordings,
              pagination: {
                page: 1,
                totalPages: 1,
                total: mockRecordings.length,
              },
            }),
        });
      }
      if (url.toString().includes('analysis-optimized/anl1')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              analysis: {
                id: 'anl1',
                status: 'completed',
                analysisResult: { summary: 'Test summary' },
                transcription: 'Test transcription',
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it('should display a list of call recordings', async () => {
    render(<CallHistoryPage />);
    await waitFor(() => {
      expect(screen.getAllByText('recording1.wav')).toHaveLength(2); // One in list, one in details
      expect(screen.getAllByText('recording2.mp3')).toHaveLength(1); // Only in list
    });
  });

  it('should select a recording and show analysis', async () => {
    render(<CallHistoryPage />);
    const recording1Elements = await screen.findAllByText('recording1.wav');
    // Click on the first instance (in the list)
    fireEvent.click(recording1Elements[0]);

    await waitFor(() => {
      expect(screen.getByTestId('analysis-display')).toBeInTheDocument();
    });
  });

  it('should show failed status for a failed analysis', async () => {
    render(<CallHistoryPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('should call delete API when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<CallHistoryPage />);

    const deleteButtons = await screen.findAllByTitle('Delete recording');
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Mock the fetch for delete
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    (global as any).fetch = mockFetch;

    window.confirm = jest.fn(() => true); // Mock confirm dialog

    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this recording and its analysis?'
    );

    // The first recording has id 'rec1'
    expect(mockFetch).toHaveBeenCalledWith('/api/upload?id=rec1', {
      method: 'DELETE',
    });
  });
});
