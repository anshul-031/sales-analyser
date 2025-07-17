import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
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
