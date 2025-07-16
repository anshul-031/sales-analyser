'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '../Navigation';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => mockPathname(),
}));

// Mock the auth context
const mockLogout = jest.fn();
const mockAuthContext = {
  user: null as any,
  loading: false,
  login: jest.fn(),
  logout: mockLogout,
  register: jest.fn(),
};

jest.mock('../../lib/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  BarChart3: ({ className, ...props }: any) => <div {...props} className={className} data-testid="barchart-icon" />,
  Upload: ({ className, ...props }: any) => <div {...props} className={className} data-testid="upload-icon" />,
  FileAudio: ({ className, ...props }: any) => <div {...props} className={className} data-testid="fileaudio-icon" />,
  User: ({ className, ...props }: any) => <div {...props} className={className} data-testid="user-icon" />,
  LogOut: ({ className, ...props }: any) => <div {...props} className={className} data-testid="logout-icon" />,
  Menu: ({ className, ...props }: any) => <div {...props} className={className} data-testid="menu-icon" />,
  X: ({ className, ...props }: any) => <div {...props} className={className} data-testid="x-icon" />,
  Code: ({ className, ...props }: any) => <div {...props} className={className} data-testid="code-icon" />,
}));

// Mock Logo component
jest.mock('../Logo', () => {
  return function Logo({ size }: { size?: string }) {
    return <div data-testid="logo" data-size={size}>Logo</div>;
  };
});

describe('Navigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/');
    // Reset auth context to default
    mockAuthContext.user = null;
    mockAuthContext.loading = false;
  });

  describe('Component Rendering', () => {
    it('should render navigation for non-auth pages', () => {
      mockPathname.mockReturnValue('/');
      
      render(<Navigation />);
      
      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
    });

    it('should not render on auth pages', () => {
      mockPathname.mockReturnValue('/login');
      
      const { container } = render(<Navigation />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render on register page', () => {
      mockPathname.mockReturnValue('/register');
      
      const { container } = render(<Navigation />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render on forgot password page', () => {
      mockPathname.mockReturnValue('/forgot-password');
      
      const { container } = render(<Navigation />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render on reset password page', () => {
      mockPathname.mockReturnValue('/reset-password');
      
      const { container } = render(<Navigation />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render logo with correct size', () => {
      render(<Navigation />);
      
      const logo = screen.getByTestId('logo');
      expect(logo).toHaveAttribute('data-size', 'md');
    });
  });

  describe('Public Navigation Items', () => {
    it('should show public navigation items for unauthenticated users', () => {
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      // Public items should be visible
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
      
      // Private items should not be visible
      expect(screen.queryByText('Upload & Analyze')).not.toBeInTheDocument();
      expect(screen.queryByText('Call History')).not.toBeInTheDocument();
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
    });

    it('should show sign in and sign up buttons for unauthenticated users', () => {
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      expect(screen.getAllByText('Sign in')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByText('Sign up')).toHaveLength(1); // Only desktop initially
    });
  });

  describe('Authenticated Navigation', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      };
      mockAuthContext.loading = false;
    });

    it('should show all navigation items for authenticated users', () => {
      render(<Navigation />);
      
      // All items should be visible
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Upload & Analyze')).toBeInTheDocument();
      expect(screen.getByText('Call History')).toBeInTheDocument();
      expect(screen.getByText('Call Analysis')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
    });

    it('should show user menu for authenticated users', () => {
      render(<Navigation />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
    });

    it('should show email when no first/last name', () => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: null,
        lastName: null,
        isEmailVerified: true,
      };
      
      render(<Navigation />);
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should show user dropdown menu when clicked', async () => {
      render(<Navigation />);
      
      const userButton = screen.getByText('John Doe').closest('button');
      expect(userButton).toBeInTheDocument();
      
      fireEvent.click(userButton!);
      
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });
    });

    it('should handle logout when clicked', async () => {
      render(<Navigation />);
      
      const userButton = screen.getByText('John Doe').closest('button');
      fireEvent.click(userButton!);
      
      await waitFor(() => {
        const signOutButton = screen.getByText('Sign out');
        fireEvent.click(signOutButton);
      });
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should show email verification warning', async () => {
      mockAuthContext.user = {
        ...mockAuthContext.user,
        isEmailVerified: false,
      };
      
      render(<Navigation />);
      
      const userButton = screen.getByText('John Doe').closest('button');
      fireEvent.click(userButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Please verify your email')).toBeInTheDocument();
      });
    });
  });

  describe('Active Link Highlighting', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      };
    });

    it('should highlight home link when on home page', () => {
      mockPathname.mockReturnValue('/');
      
      render(<Navigation />);
      
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('border-indigo-500', 'text-gray-900');
    });

    it('should highlight upload link when on upload page', () => {
      mockPathname.mockReturnValue('/upload');
      
      render(<Navigation />);
      
      const uploadLink = screen.getByText('Upload & Analyze').closest('a');
      expect(uploadLink).toHaveClass('border-indigo-500', 'text-gray-900');
    });

    it('should highlight call history link when on call history page', () => {
      mockPathname.mockReturnValue('/call-history');
      
      render(<Navigation />);
      
      const callHistoryLink = screen.getByText('Call History').closest('a');
      expect(callHistoryLink).toHaveClass('border-indigo-500', 'text-gray-900');
    });

    it('should highlight analytics link when on analytics page', () => {
      mockPathname.mockReturnValue('/analytics');
      
      render(<Navigation />);
      
      const analyticsLink = screen.getByText('Analytics').closest('a');
      expect(analyticsLink).toHaveClass('border-indigo-500', 'text-gray-900');
    });

    it('should not highlight non-active links', () => {
      mockPathname.mockReturnValue('/upload');
      
      render(<Navigation />);
      
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      };
    });

    it('should show mobile menu button', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });

    it('should toggle mobile menu when button clicked', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      expect(menuButton).toBeInTheDocument();
      
      fireEvent.click(menuButton!);
      
      // Menu should open and show X icon
      await waitFor(() => {
        expect(screen.getByTestId('x-icon')).toBeInTheDocument();
      });
      
      // Click again to close
      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);
      
      await waitFor(() => {
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      });
    });

    it('should show mobile navigation items when menu is open', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        // Should show mobile version of navigation items
        expect(screen.getAllByText('Home')).toHaveLength(2); // Desktop + mobile
        expect(screen.getAllByText('Upload & Analyze')).toHaveLength(2);
      });
    });

    it('should close mobile menu when navigation item is clicked', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        const mobileHomeLink = screen.getAllByText('Home')[1]; // Get mobile version
        fireEvent.click(mobileHomeLink);
      });
      
      // Menu should close
      await waitFor(() => {
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      });
    });

    it('should show user info in mobile menu', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')).toHaveLength(2); // Desktop + mobile
        expect(screen.getAllByText('test@example.com')).toHaveLength(1); // Only in mobile
      });
    });

    it('should handle mobile logout', async () => {
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        const mobileSignOutButton = screen.getAllByText('Sign out')[0]; // Mobile version
        fireEvent.click(mobileSignOutButton);
      });
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should show sign in button in mobile menu for unauthenticated users', () => {
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      expect(screen.getAllByText('Sign in')).toHaveLength(2); // Desktop + mobile
    });

    it('should show sign up button in mobile menu for unauthenticated users', async () => {
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        expect(screen.getAllByText('Sign up')).toHaveLength(2); // Desktop + mobile
      });
    });

    it('should close mobile menu when sign up is clicked', async () => {
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);
      
      await waitFor(() => {
        const signUpButtons = screen.getAllByText('Sign up');
        const mobileSignUpButton = signUpButtons.find(btn => 
          btn.className.includes('block px-4 py-2')
        );
        fireEvent.click(mobileSignUpButton!);
      });
      
      // Menu should close
      await waitFor(() => {
        expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should handle loading state properly', () => {
      mockAuthContext.loading = true;
      mockAuthContext.user = null;
      
      render(<Navigation />);
      
      // Should show public items during loading
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Integrations')).toBeInTheDocument();
      
      // Should not show auth buttons during loading
      expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
      expect(screen.queryByText('Sign up')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Icons', () => {
    beforeEach(() => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      };
    });

    it('should render correct icons for navigation items', () => {
      render(<Navigation />);
      
      expect(screen.getAllByTestId('barchart-icon')).toHaveLength(2); // Home + Analytics
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('fileaudio-icon')).toHaveLength(2); // Call History + Call Analysis
      expect(screen.getByTestId('code-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user name gracefully', () => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: undefined,
        lastName: undefined,
        isEmailVerified: true,
      };
      
      render(<Navigation />);
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should handle partial user name', () => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: undefined,
        isEmailVerified: true,
      };
      
      render(<Navigation />);
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should close user menu when clicked outside', async () => {
      mockAuthContext.user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
      };
      
      render(<Navigation />);
      
      const userButton = screen.getByText('John Doe').closest('button');
      fireEvent.click(userButton!);
      
      await waitFor(() => {
        expect(screen.getByText('Sign out')).toBeInTheDocument();
      });
      
      // Click the user button again to close the menu
      fireEvent.click(userButton!);
      
      await waitFor(() => {
        expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
      });
    });
  });
});
