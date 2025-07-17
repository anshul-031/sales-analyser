import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Next.js navigation hooks
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock the auth context
const mockLogin = jest.fn();
const mockAuthContext = {
  user: null as any,
  loading: false,
  login: mockLogin,
  logout: jest.fn(),
  register: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

jest.mock('../../lib/auth-context', () => ({
  useAuth: () => mockAuthContext,
}));

// Mock Logo component
jest.mock('../Logo', () => {
  return function MockLogo({ size }: { size?: string }) {
    return <div data-testid="logo">Logo {size}</div>;
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset auth context to default state
  mockAuthContext.user = null;
  mockAuthContext.loading = false;
  
  // Reset search params
  mockSearchParams.delete('verified');
  mockSearchParams.delete('redirect');
  
  // Clear fetch mock
  (fetch as jest.Mock).mockClear();
});

describe('LoginForm', () => {
  it('renders login form with all elements', () => {
    render(<LoginForm />);
    
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByText('create a new account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows loading state when auth context is loading', () => {
    mockAuthContext.loading = true;
    
    render(<LoginForm />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects authenticated users', async () => {
    mockAuthContext.user = { id: '1', email: 'test@test.com' };
    
    render(<LoginForm />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows email verification success message', () => {
    mockSearchParams.set('verified', 'true');
    
    render(<LoginForm />);
    
    expect(screen.getByText('Email verified successfully! You can now log in.')).toBeInTheDocument();
  });

  it('allows user to toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const passwordInput = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByRole('button', { name: '' }); // Password toggle button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    await user.click(submitButton);
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    
    await waitFor(() => {
      expect(screen.getByText('Login successful! Redirecting...')).toBeInTheDocument();
    });
  });

  it('handles login failure with generic error', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, message: 'Invalid credentials' });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('handles email verification needed error', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please verify your email address first.')).toBeInTheDocument();
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
  });

  it('handles resend verification email successfully', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true })
    });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
    
    const resendButton = screen.getByText('Resend Verification Email');
    await user.click(resendButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
      expect(screen.getByText('Verification email sent! Please check your inbox and spam folder.')).toBeInTheDocument();
    });
  });

  it('handles resend verification email failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: false, message: 'Failed to send email' })
    });
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    
    await waitFor(() => {
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Resend Verification Email'));
    
    await waitFor(() => {
      expect(screen.getByText('Failed to send email')).toBeInTheDocument();
    });
  });

  it('handles resend verification without email', async () => {
    const user = userEvent.setup();
    
    render(<LoginForm />);
    
    // First trigger the verification needed state by attempting login with verification error
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    // Fill in both email and password for initial login attempt
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    
    await waitFor(() => {
      expect(screen.getByText('Please verify your email address first.')).toBeInTheDocument();
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
    
    // Clear email field
    await user.clear(emailInput);
    
    await user.click(screen.getByText('Resend Verification Email'));
    
    await waitFor(() => {
      expect(screen.getByText('Please enter your email address first.')).toBeInTheDocument();
    });
  });

  it('handles network error during resend verification', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<LoginForm />);
    
    // First trigger the verification needed state by attempting login with verification error
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    
    await waitFor(() => {
      expect(screen.getByText('Please verify your email address first.')).toBeInTheDocument();
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Resend Verification Email'));
    
    await waitFor(() => {
      expect(screen.getByText('An error occurred while sending the verification email.')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('handles login network error', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockLogin.mockRejectedValue(new Error('Network error'));
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('prevents multiple form submissions', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // First click
    await user.click(submitButton);
    expect(mockLogin).toHaveBeenCalledTimes(1);
    
    // Second click should be prevented
    await user.click(submitButton);
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it('disables form inputs during loading', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<LoginForm />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
  });

  it('shows loading state during resend verification', async () => {
    const user = userEvent.setup();
    
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<LoginForm />);
    
    // First trigger the verification needed state by attempting login with verification error
    mockLogin.mockResolvedValue({ 
      success: false, 
      message: 'Please verify your email address first.' 
    });
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    
    await waitFor(() => {
      expect(screen.getByText('Please verify your email address first.')).toBeInTheDocument();
      expect(screen.getByText('Resend Verification Email')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Resend Verification Email'));
    
    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
  });

  it('has correct navigation links', () => {
    render(<LoginForm />);
    
    const registerLink = screen.getByText('create a new account');
    const forgotPasswordLink = screen.getByText('Forgot your password?');
    
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('handles custom redirect parameter', async () => {
    mockSearchParams.set('redirect', '/custom-page');
    mockAuthContext.user = { id: '1', email: 'test@test.com' };
    
    render(<LoginForm />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-page');
    });
  });
});
