import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Logo from '../Logo';

describe('Logo Component', () => {
  it('renders with default props', () => {
    render(<Logo />);
    
    const logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/company_logo.jpg');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<Logo size="sm" />);
    
    let logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('h-10', 'w-10');

    rerender(<Logo size="md" />);
    logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('h-12');

    rerender(<Logo size="lg" />);
    logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('h-20', 'w-20');

    rerender(<Logo size="xl" />);
    logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('h-24', 'w-24');
  });

  it('applies custom className', () => {
    render(<Logo className="custom-class" />);
    
    const container = screen.getByAltText('AI Call Analyser Logo').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('uses medium size by default', () => {
    render(<Logo />);
    
    const logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('h-12');
  });

  it('applies object-contain class to logo image', () => {
    render(<Logo />);
    
    const logo = screen.getByAltText('AI Call Analyser Logo');
    expect(logo).toHaveClass('object-contain');
  });

  it('wraps logo in flex container with correct classes', () => {
    render(<Logo />);
    
    const container = screen.getByAltText('AI Call Analyser Logo').parentElement;
    expect(container).toHaveClass('flex', 'items-center');
  });

  it('combines custom className with default classes', () => {
    render(<Logo className="extra-spacing" />);
    
    const container = screen.getByAltText('AI Call Analyser Logo').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'extra-spacing');
  });
});
