import { render, screen } from '@testing-library/react';
import LoginPage from '../page';

// Mock the LoginForm component
jest.mock('@/components/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="login-form">Login Form Component</div>;
  };
});

describe('Login Page', () => {
  it('renders the login form component', () => {
    render(<LoginPage />);
    
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByText('Login Form Component')).toBeInTheDocument();
  });
});
