import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ForgotPasswordForm from '../ForgotPasswordForm';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

const mockPush = jest.fn();
const mockForgotPassword = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        push: mockPush,
    });
    (useAuth as jest.Mock).mockReturnValue({
        forgotPassword: mockForgotPassword,
        user: null,
        loading: false,
    });
});

describe('ForgotPasswordForm', () => {
    it('renders the form correctly', () => {
        render(<ForgotPasswordForm />);
        
        expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
        expect(screen.getByText('Enter your email address and we\'ll send you a link to reset your password.')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
    });

    it('shows loading state when auth is loading', () => {
        (useAuth as jest.Mock).mockReturnValue({
            forgotPassword: mockForgotPassword,
            user: null,
            loading: true,
        });
        
        render(<ForgotPasswordForm />);
        
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('redirects authenticated users to home', () => {
        (useAuth as jest.Mock).mockReturnValue({
            forgotPassword: mockForgotPassword,
            user: { id: '1', email: 'test@example.com' },
            loading: false,
        });
        
        render(<ForgotPasswordForm />);
        
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('updates email input value', () => {
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        
        expect(emailInput).toHaveValue('test@example.com');
    });

    it('handles successful form submission', async () => {
        mockForgotPassword.mockResolvedValue({ success: true, message: 'Password reset email sent!' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com');
        
        await waitFor(() => {
            expect(screen.getByText('Password reset email sent!')).toBeInTheDocument();
        });
        
        // Email input should be cleared after successful submission
        expect(emailInput).toHaveValue('');
    });

    it('handles form submission with API error', async () => {
        mockForgotPassword.mockResolvedValue({ success: false, message: 'User not found' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('User not found')).toBeInTheDocument();
        });
    });

    it('shows loading state during form submission', async () => {
        mockForgotPassword.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        expect(screen.getByText('Sending...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
        expect(emailInput).toBeDisabled();
        
        await waitFor(() => {
            expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
        });
    });

    it('displays success message with instructions', async () => {
        mockForgotPassword.mockResolvedValue({ success: true, message: 'Password reset email sent!' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Password reset email sent!')).toBeInTheDocument();
            expect(screen.getByText('Please check your email for the reset link. It may take a few minutes to arrive.')).toBeInTheDocument();
        });
    });

    it('renders back to sign in link', () => {
        render(<ForgotPasswordForm />);
        
        const signInLink = screen.getByRole('link', { name: 'Back to sign in' });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/login');
    });

    it('clears errors when form is resubmitted', async () => {
        mockForgotPassword
            .mockResolvedValueOnce({ success: false, message: 'User not found' })
            .mockResolvedValueOnce({ success: true, message: 'Success!' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        // First submission with error
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('User not found')).toBeInTheDocument();
        });
        
        // Second submission should clear the error
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.queryByText('User not found')).not.toBeInTheDocument();
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
    });

    it('handles forgotPassword function throwing an error', async () => {
        mockForgotPassword.mockRejectedValue(new Error('Network error'));
        
        // Mock console.error to avoid test output noise
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
        });
        
        consoleErrorSpy.mockRestore();
    });

    it('handles network error during forgot password', async () => {
        mockForgotPassword.mockResolvedValue({ success: false, message: 'An error occurred while processing your request' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('An error occurred while processing your request')).toBeInTheDocument();
        });
    });

    it('prevents form submission with empty email', () => {
        render(<ForgotPasswordForm />);
        
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        // Try to submit with empty email
        fireEvent.click(submitButton);
        
        // Form should not be submitted due to HTML5 validation
        expect(mockForgotPassword).not.toHaveBeenCalled();
    });

    it('handles form submission with default success message', async () => {
        mockForgotPassword.mockResolvedValue({ success: true });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Password reset email sent!')).toBeInTheDocument();
        });
    });

    it('handles form submission with default error message', async () => {
        mockForgotPassword.mockResolvedValue({ success: false });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
        });
    });

    it('validates email input type', () => {
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(emailInput).toHaveAttribute('required');
        expect(emailInput).toHaveAttribute('autoComplete', 'email');
    });

    it('clears success message when form is resubmitted', async () => {
        mockForgotPassword
            .mockResolvedValueOnce({ success: true, message: 'Success message' })
            .mockResolvedValueOnce({ success: false, message: 'Error message' });
        
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        // First submission with success
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
        });
        
        // Second submission should clear the success message
        fireEvent.change(emailInput, { target: { value: 'test2@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.queryByText('Success message')).not.toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
        });
    });

    it('has proper accessibility attributes', () => {
        render(<ForgotPasswordForm />);
        
        const emailInput = screen.getByLabelText('Email Address');
        const submitButton = screen.getByRole('button', { name: 'Send reset link' });
        
        expect(emailInput).toHaveAccessibleName('Email Address');
        expect(submitButton).toHaveAccessibleName('Send reset link');
        expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');
    });
});
