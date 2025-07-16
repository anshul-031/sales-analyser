import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from '../LandingPage';

// Mock dependencies
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('../ContactForm', () => {
  return function MockContactForm({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="contact-form">
        <button onClick={onClose} data-testid="contact-form-close">Close</button>
      </div>
    ) : null;
  };
});

jest.mock('../Logo', () => {
  return function MockLogo({ size }: any) {
    return <div data-testid="logo" data-size={size}>Logo</div>;
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  BarChart3: (props: any) => <div data-testid="barchart3-icon" {...props} />,
  Upload: (props: any) => <div data-testid="upload-icon" {...props} />,
  FileText: (props: any) => <div data-testid="filetext-icon" {...props} />,
  Zap: (props: any) => <div data-testid="zap-icon" {...props} />,
  MessageCircle: (props: any) => <div data-testid="messagecircle-icon" {...props} />,
  Settings: (props: any) => <div data-testid="settings-icon" {...props} />,
  Star: (props: any) => <div data-testid="star-icon" {...props} />,
  CheckCircle: (props: any) => <div data-testid="checkcircle-icon" {...props} />,
  ArrowRight: (props: any) => <div data-testid="arrowright-icon" {...props} />,
  Mail: (props: any) => <div data-testid="mail-icon" {...props} />,
  Users: (props: any) => <div data-testid="users-icon" {...props} />,
  TrendingUp: (props: any) => <div data-testid="trendingup-icon" {...props} />,
  Shield: (props: any) => <div data-testid="shield-icon" {...props} />,
  Clock: (props: any) => <div data-testid="clock-icon" {...props} />,
  Award: (props: any) => <div data-testid="award-icon" {...props} />,
  Brain: (props: any) => <div data-testid="brain-icon" {...props} />
}));

describe('LandingPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hero Section', () => {
    it('should render hero section with main heading', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Transform Your Sales Calls')).toBeInTheDocument();
      expect(screen.getByText('Into Winning Insights')).toBeInTheDocument();
    });

    it('should display hero description text', () => {
      render(<LandingPage />);
      
      expect(screen.getByText(/Upload your call recordings and get AI-powered analysis/)).toBeInTheDocument();
    });

    it('should show CTA buttons in hero section', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Start Analyzing Now')).toBeInTheDocument();
      expect(screen.getByText('Contact Sales')).toBeInTheDocument();
    });

    it('should have correct link for start analyzing button', () => {
      render(<LandingPage />);
      
      const startButton = screen.getByText('Start Analyzing Now').closest('a');
      expect(startButton).toHaveAttribute('href', '/upload');
    });

    it('should open contact form when Contact Sales is clicked', () => {
      render(<LandingPage />);
      
      const contactButton = screen.getByText('Contact Sales');
      fireEvent.click(contactButton);
      
      expect(screen.getByTestId('contact-form')).toBeInTheDocument();
    });

    it('should render hero section icons', () => {
      render(<LandingPage />);
      
      expect(screen.getAllByTestId('upload-icon')).toHaveLength(2); // Hero + CTA sections
      expect(screen.getAllByTestId('arrowright-icon')).toHaveLength(2); // Hero + CTA sections
      expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('should render all feature cards', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('AI Transcription & Analysis')).toBeInTheDocument();
      expect(screen.getAllByText('Performance Scoring')[0]).toBeInTheDocument();
      expect(screen.getByText('AI Chat Assistant')).toBeInTheDocument();
      expect(screen.getAllByText('Custom Analysis')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Detailed Reports')[0]).toBeInTheDocument();
      expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    });

    it('should display feature descriptions', () => {
      render(<LandingPage />);
      
      expect(screen.getByText(/Automatic speech-to-text conversion with speaker identification/)).toBeInTheDocument();
      expect(screen.getByText(/Get detailed scores across multiple sales criteria/)).toBeInTheDocument();
      expect(screen.getByText(/Ask questions about your call recordings/)).toBeInTheDocument();
      expect(screen.getByText(/Your sales data is protected with enterprise-grade security/)).toBeInTheDocument();
    });

    it('should render feature icons', () => {
      render(<LandingPage />);
      
      expect(screen.getAllByTestId('barchart3-icon')).toHaveLength(2);
      expect(screen.getByTestId('brain-icon')).toBeInTheDocument();
      expect(screen.getByTestId('messagecircle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByTestId('filetext-icon')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('should show feature bullet points', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Multi-language support')).toBeInTheDocument();
      expect(screen.getByText('10-point scoring system')).toBeInTheDocument();
      expect(screen.getByText('Context-aware responses')).toBeInTheDocument();
      expect(screen.getByText('Custom parameters')).toBeInTheDocument();
      expect(screen.getByText('Exportable formats')).toBeInTheDocument();
      expect(screen.getByText('Encrypted processing')).toBeInTheDocument();
    });

    it('should render check circle icons for bullet points', () => {
      render(<LandingPage />);
      
      expect(screen.getAllByTestId('checkcircle-icon')).toHaveLength(19);
    });
  });

  describe('Footer', () => {
    it('should render footer with logo', () => {
      render(<LandingPage />);
      
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render footer links', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('AI Transcription')).toBeInTheDocument();
      expect(screen.getAllByText('Custom Analysis')[1]).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });
  });

  describe('Contact Form Integration', () => {
    it('should not show contact form initially', () => {
      render(<LandingPage />);
      
      expect(screen.queryByTestId('contact-form')).not.toBeInTheDocument();
    });

    it('should show contact form when opened', () => {
      render(<LandingPage />);
      
      const contactButton = screen.getByText('Contact Sales');
      fireEvent.click(contactButton);
      
      expect(screen.getByTestId('contact-form')).toBeInTheDocument();
    });

    it('should close contact form when close button is clicked', () => {
      render(<LandingPage />);
      
      const contactButton = screen.getByText('Contact Sales');
      fireEvent.click(contactButton);
      
      const closeButton = screen.getByTestId('contact-form-close');
      fireEvent.click(closeButton);
      
      expect(screen.queryByTestId('contact-form')).not.toBeInTheDocument();
    });
  });
});
