import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import UploadPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/components/FileUpload', () => {
  return function MockFileUpload({ onUploadComplete }: { onUploadComplete?: (files: any[]) => void }) {
    return (
      <div data-testid="file-upload">
        <button 
          onClick={() => onUploadComplete?.([{ id: 'test-file-1', originalName: 'test.mp3', uploadedAt: '2023-01-01' }])}
        >
          Mock Upload
        </button>
      </div>
    );
  };
});

jest.mock('@/components/AnalysisResults', () => {
  return function MockAnalysisResults() {
    return <div data-testid="analysis-results">Analysis Results</div>;
  };
});

jest.mock('@/components/Chatbot', () => {
  return function MockChatbot({ onClose }: { onClose?: () => void }) {
    return (
      <div data-testid="chatbot">
        <button onClick={onClose}>Close Chatbot</button>
      </div>
    );
  };
});

jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/constants', () => ({
  MAX_FILE_SIZE: 5242880,
  MAX_FILES: 5,
}));

jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  User: () => <div data-testid="user-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}));

const mockPush = jest.fn();
const mockUseAuth = require('@/lib/auth-context').useAuth;

describe('UploadPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // Mock fetch globally
    global.fetch = jest.fn();
    
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<UploadPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('renders upload step when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        uploads: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }
      }),
    });

    render(<UploadPage />);

    // Wait for loading to complete and file upload component to appear
    await waitFor(() => {
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('does not redirect when user is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(<UploadPage />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('loads uploaded files on mount when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    const mockResponse = {
      success: true,
      uploads: [
        { id: 'file1', originalName: 'test1.mp3', uploadedAt: '2023-01-01' },
        { id: 'file2', originalName: 'test2.mp3', uploadedAt: '2023-01-02' }
      ],
      pagination: { total: 2, page: 1, limit: 50, totalPages: 1 }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    render(<UploadPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/upload');
    });
  });

  it('handles API error when loading files', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<UploadPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Component should handle error gracefully
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('updates uploaded files when upload completes', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    // Mock initial empty response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        uploads: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }
      }),
    });

    render(<UploadPage />);

    // Wait for loading to complete and upload button to appear
    const uploadButton = await screen.findByText('Mock Upload');
    fireEvent.click(uploadButton);

    // The component should handle the file upload completion
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('renders loading state', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    // Mock slow API response
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            uploads: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }
          }),
        }), 100)
      )
    );

    render(<UploadPage />);

    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders step navigation', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        uploads: [],
        pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }
      }),
    });

    render(<UploadPage />);

    // Should render step navigation elements
    expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
  });

  it('handles successful file upload flow', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user123', email: 'test@example.com' },
      loading: false,
    });

    // Mock API responses
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          uploads: [],
          pagination: { total: 0, page: 1, limit: 50, totalPages: 1 }
        }),
      });

    render(<UploadPage />);

    await waitFor(() => {
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });
  });
});
