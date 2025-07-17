import { render, screen } from '@testing-library/react';
import ForgotPasswordPage from '../page';

// Mock the ForgotPasswordForm component
jest.mock('@/components/ForgotPasswordForm', () => {
  return function MockForgotPasswordForm() {
    return <div data-testid="forgot-password-form">Forgot Password Form Component</div>;
  };
});

describe('Forgot Password Page', () => {
  it('renders the forgot password form component', () => {
    render(<ForgotPasswordPage />);
    
    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
    expect(screen.getByText('Forgot Password Form Component')).toBeInTheDocument();
  });
});
