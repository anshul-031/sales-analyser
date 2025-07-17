import { render, screen } from '@testing-library/react';
import RegisterPage from '../page';

// Mock the RegisterForm component
jest.mock('@/components/RegisterForm', () => {
  return function MockRegisterForm() {
    return <div data-testid="register-form">Register Form Component</div>;
  };
});

describe('Register Page', () => {
  it('renders the register form component', () => {
    render(<RegisterPage />);
    
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByText('Register Form Component')).toBeInTheDocument();
  });
});
