import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsPage from '../analytics/page';

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the logger
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Analytics Page', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    const { useRouter } = jest.requireMock('next/navigation');
    useRouter.mockReturnValue({ push: mockPush });
  });

  it('should render analytics page when authenticated', async () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
    });

    render(<AnalyticsPage />);
    
    expect(await screen.findByRole('heading', { name: /analytics dashboard/i })).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: true,
    });

    render(<AnalyticsPage />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should redirect when not authenticated', () => {
    const { useAuth } = jest.requireMock('@/lib/auth-context');
    useAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AnalyticsPage />);
    
    // The useEffect should trigger redirect
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
