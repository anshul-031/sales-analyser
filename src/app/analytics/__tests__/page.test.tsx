
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsPage from '@/app/analytics/page';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

// Mock the useAuth hook
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AnalyticsPage', () => {
  const mockRouter = { push: jest.fn() };
  const mockUseRouter = useRouter as jest.Mock;
  mockUseRouter.mockReturnValue(mockRouter);

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: { id: '1' }, loading: false });
    (fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
  });

  it('should render loading spinner when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<AnalyticsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to /login if user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<AnalyticsPage />);
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('should render loading spinner while fetching data', () => {
    (fetch as jest.Mock).mockResolvedValue({ json: () => Promise.resolve({ success: true, uploads: [], analyses: [] }) });
    render(<AnalyticsPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render the dashboard with fetched data', async () => {
    const mockUploads = [
      { id: '1', mimeType: 'audio/mp3', originalName: 'test.mp3', uploadedAt: new Date().toISOString() },
    ];
    const mockAnalyses = [
      { id: '1', transcription: 'hello', createdAt: new Date().toISOString(), upload: { originalName: 'test.mp3' } },
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, uploads: mockUploads }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, analytics: { analyses: mockAnalyses } }) });

    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Call Activity')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      // Check that the loading spinner is gone, but no data is displayed
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByText('Call Activity')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
    });
  });
});
