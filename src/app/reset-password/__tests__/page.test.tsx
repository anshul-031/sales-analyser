import { render, screen } from '@testing-library/react';
import ResetPasswordPage from '../page';

// Mock the ResetPasswordForm component
jest.mock('@/components/ResetPasswordForm', () => {
  return function MockResetPasswordForm() {
    return <div data-testid="reset-password-form">Reset Password Form Component</div>;
  };
});

describe('Reset Password Page', () => {
  it('renders the reset password form component', () => {
    render(<ResetPasswordPage />);
    
    expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
    expect(screen.getByText('Reset Password Form Component')).toBeInTheDocument();
  });
});
