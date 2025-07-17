import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ResetPasswordForm from '../ResetPasswordForm';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    useSearchParams: jest.fn(),
}));

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
    useAuth: jest.fn(),
}));

const mockPush = jest.fn();
const mockGet = jest.fn();
const mockResetPassword = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
        push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet,
    });
    (useAuth as jest.Mock).mockReturnValue({
        resetPassword: mockResetPassword,
        user: null,
        loading: false,
    });
});

describe('ResetPasswordForm', () => {
    it('renders the form correctly', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        expect(screen.getByText('Reset your password')).toBeInTheDocument();
        expect(screen.getByText('Enter your new password below')).toBeInTheDocument();
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
    });

    it('shows loading state when auth is loading', () => {
        (useAuth as jest.Mock).mockReturnValue({
            resetPassword: mockResetPassword,
            user: null,
            loading: true,
        });
        
        render(<ResetPasswordForm />);
        
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('redirects authenticated users without token to home', () => {
        mockGet.mockReturnValue(null);
        (useAuth as jest.Mock).mockReturnValue({
            resetPassword: mockResetPassword,
            user: { id: '1', email: 'test@example.com' },
            loading: false,
        });
        
        render(<ResetPasswordForm />);
        
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('shows error when no token is provided', () => {
        mockGet.mockReturnValue(null);
        
        render(<ResetPasswordForm />);
        
        expect(screen.getByText('Invalid reset link. Please request a new password reset.')).toBeInTheDocument();
    });

    it('toggles password visibility', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const toggleButtons = screen.getAllByRole('button');
        const passwordToggleButton = toggleButtons.find(button => 
            button.parentElement?.contains(passwordInput)
        );
        
        expect(passwordInput).toHaveAttribute('type', 'password');
        
        fireEvent.click(passwordToggleButton!);
        expect(passwordInput).toHaveAttribute('type', 'text');
        
        fireEvent.click(passwordToggleButton!);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles confirm password visibility', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const toggleButtons = screen.getAllByRole('button');
        const confirmToggleButton = toggleButtons.find(button => 
            button.parentElement?.contains(confirmPasswordInput)
        );
        
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
        
        fireEvent.click(confirmToggleButton!);
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });

    it('updates password strength indicator', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        
        // Test weak password
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        expect(screen.getByText('Very Weak')).toBeInTheDocument();
        
        // Test strong password
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('shows password mismatch error', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
        
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('handles form submission with valid data', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successful!' });
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'StrongPassword123!');
        
        await waitFor(() => {
            expect(screen.getByText('Password reset successful!')).toBeInTheDocument();
        });
    });

    it('handles form submission with API error', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockResolvedValue({ success: false, message: 'Token expired' });
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Token expired')).toBeInTheDocument();
        });
    });

    it('prevents form submission when passwords do not match', async () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'different123' } });
        fireEvent.click(submitButton);
        
        expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('disables form when no token is provided', () => {
        mockGet.mockReturnValue(null);
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
    });

    it('shows loading state during form submission', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        expect(screen.getByText('Resetting...')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.queryByText('Resetting...')).not.toBeInTheDocument();
        });
    });

    it('redirects to login after successful password reset', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockResolvedValue({ success: true, message: 'Password reset successful!' });
        
        jest.useFakeTimers();
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Password reset successful!')).toBeInTheDocument();
        });
        
        jest.advanceTimersByTime(3000);
        
        expect(mockPush).toHaveBeenCalledWith('/login');
        
        jest.useRealTimers();
    });

    it('renders password requirements', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        expect(screen.getByText('Password requirements:')).toBeInTheDocument();
        expect(screen.getByText('At least 8 characters long')).toBeInTheDocument();
        expect(screen.getByText('At least one lowercase letter')).toBeInTheDocument();
        expect(screen.getByText('At least one uppercase letter')).toBeInTheDocument();
        expect(screen.getByText('At least one number')).toBeInTheDocument();
    });

    it('renders back to sign in link', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const signInLink = screen.getByRole('link', { name: 'Back to sign in' });
        expect(signInLink).toBeInTheDocument();
        expect(signInLink).toHaveAttribute('href', '/login');
    });

    it('shows different password strength levels', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        
        // Test different strength levels
        fireEvent.change(passwordInput, { target: { value: 'a' } });
        expect(screen.getByText('Very Weak')).toBeInTheDocument();
        
        fireEvent.change(passwordInput, { target: { value: 'password' } });
        expect(screen.getByText('Weak')).toBeInTheDocument();
        
        fireEvent.change(passwordInput, { target: { value: 'Password' } });
        expect(screen.getByText('Fair')).toBeInTheDocument();
        
        fireEvent.change(passwordInput, { target: { value: 'Password1' } });
        expect(screen.getByText('Good')).toBeInTheDocument();
        
        fireEvent.change(passwordInput, { target: { value: 'Password1!' } });
        expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('handles form submission without token', async () => {
        mockGet.mockReturnValue(null);
        
        render(<ResetPasswordForm />);
        
        // Should not allow form submission without token
        expect(screen.getByText('Invalid reset link. Please request a new password reset.')).toBeInTheDocument();
    });

    it('handles password validation edge cases', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        
        // Test empty password
        fireEvent.change(passwordInput, { target: { value: '' } });
        expect(screen.queryByText('Very Weak')).not.toBeInTheDocument();
        
        // Test password with only numbers
        fireEvent.change(passwordInput, { target: { value: '12345678' } });
        expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('clears errors when form is resubmitted', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword
            .mockResolvedValueOnce({ success: false, message: 'Token expired' })
            .mockResolvedValueOnce({ success: true, message: 'Success!' });
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        // First submission with error
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Token expired')).toBeInTheDocument();
        });
        
        // Second submission should clear the error
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.queryByText('Token expired')).not.toBeInTheDocument();
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
    });

    it('handles resetPassword function throwing an error', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockRejectedValue(new Error('Network error'));
        
        // Mock console.error to avoid test output noise
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Failed to reset password')).toBeInTheDocument();
        });
        
        consoleErrorSpy.mockRestore();
    });

    it('handles network error during password reset', async () => {
        mockGet.mockReturnValue('valid-token');
        mockResetPassword.mockResolvedValue({ success: false, message: 'An error occurred while resetting your password' });
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: 'Reset password' });
        
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('An error occurred while resetting your password')).toBeInTheDocument();
        });
    });

    it('handles different password strength scenarios comprehensively', () => {
        mockGet.mockReturnValue('valid-token');
        
        render(<ResetPasswordForm />);
        
        const passwordInput = screen.getByLabelText('New Password');
        
        // Test all strength levels systematically
        const testCases = [
            { password: 'a', expected: 'Very Weak' },
            { password: 'abc', expected: 'Very Weak' },
            { password: 'abcdefgh', expected: 'Weak' },
            { password: 'Abcdefgh', expected: 'Fair' },
            { password: 'Abcdefg1', expected: 'Good' },
            { password: 'Abcdefg1!', expected: 'Strong' },
        ];
        
        testCases.forEach(({ password, expected }) => {
            fireEvent.change(passwordInput, { target: { value: password } });
            if (password.length > 0) {
                expect(screen.getByText(expected)).toBeInTheDocument();
            }
        });
    });
});
