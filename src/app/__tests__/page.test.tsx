import { render, screen } from '@testing-library/react';
import Home from '../page';

// Mock the LandingPage component
jest.mock('@/components/LandingPage', () => {
  return function MockLandingPage() {
    return <div data-testid="landing-page">Landing Page Component</div>;
  };
});

describe('Home Page', () => {
  it('renders the landing page component', () => {
    render(<Home />);
    
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    expect(screen.getByText('Landing Page Component')).toBeInTheDocument();
  });
});
