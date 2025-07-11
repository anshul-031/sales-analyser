import React from 'react';
import { render, screen } from '@testing-library/react';
import CallAnalysisPage from '../call-analysis/page';

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the logger and utils
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
  isAnalysisCompleted: jest.fn(),
  isAnalysisFailed: jest.fn(),
}));

describe('Call Analysis Page', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useRouter } = jest.requireMock('next/navigation');
    useRouter.mockReturnValue({ push: mockPush });
  });

  it('should render call analysis page when authenticated', () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });

    render(<CallAnalysisPage />);
    
    expect(screen.getByRole('heading', { name: /call recording analysis/i })).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: true,
    });

    render(<CallAnalysisPage />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should redirect when not authenticated', () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<CallAnalysisPage />);
    
    // The useEffect should trigger redirect
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
