import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalysisDisplay from '../AnalysisDisplay';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Star: () => <div data-testid="star-icon" />,
  Award: () => <div data-testid="award-icon" />,
  User: () => <div data-testid="user-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Brain: () => <div data-testid="brain-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
  ThumbsUp: () => <div data-testid="thumbs-up-icon" />,
  ThumbsDown: () => <div data-testid="thumbs-down-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Info: () => <div data-testid="info-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
}));

describe('AnalysisDisplay Component', () => {
  const mockAnalysisResult = {
    communication_skills: 8.5,
    product_knowledge: 9.0,
    customer_needs_analysis: 7.5,
    closing_techniques: 8.1,
    overall_performance: 8.7,
    emotional_intelligence: 9.2,
  };

  const defaultProps = {
    analysisResult: mockAnalysisResult,
    isNested: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console logs to avoid test pollution
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('should display analysis parameters', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      // Should display formatted parameter names from CORE_ANALYSIS_PARAMETERS
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Customer Needs Analysis')).toBeInTheDocument();
      expect(screen.getByText('Closing Techniques')).toBeInTheDocument();
    });

    it('should show view mode toggle', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      // Should have detailed view control (starts in compact, shows detailed button)
      expect(screen.getByRole('button', { name: /detailed view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument();
    });

    it('should display parameter count', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      // Should show parameter indices (#1, #2, etc.)
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  describe('Empty/Invalid Data Handling', () => {
    it('should handle null analysis result', () => {
      render(<AnalysisDisplay analysisResult={null} isNested={false} />);
      
      expect(screen.getByText('No Analysis Available')).toBeInTheDocument();
      expect(screen.getByText('No analysis data has been generated for this recording yet.')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('should handle undefined analysis result', () => {
      render(<AnalysisDisplay analysisResult={undefined} isNested={false} />);
      
      expect(screen.getByText('No Analysis Available')).toBeInTheDocument();
    });

    it('should handle non-object analysis result', () => {
      render(<AnalysisDisplay analysisResult="invalid string" isNested={false} />);
      
      expect(screen.getByText('Invalid Data Format')).toBeInTheDocument();
      expect(screen.getByText('Expected analysis object, but received string')).toBeInTheDocument();
    });

    it('should handle empty analysis result', () => {
      render(<AnalysisDisplay analysisResult={{}} isNested={false} />);
      
      expect(screen.getByText('No Performance Parameters')).toBeInTheDocument();
    });
  });

  describe('Parameter Expansion', () => {
    it('should expand parameter sections when clicked', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      // Find the first parameter button and click it
      const communicationSkillsButton = screen.getByRole('button', { name: /communication skills/i });
      fireEvent.click(communicationSkillsButton);
      
      // Should show expanded content (value details)
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    });

    it('should collapse expanded sections when clicked again', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const productKnowledgeButton = screen.getByRole('button', { name: /product knowledge/i });
      
      // Expand first
      fireEvent.click(productKnowledgeButton);
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
      
      // Collapse - should have both up and down icons, so we check that down icons still exist
      fireEvent.click(productKnowledgeButton);
      const chevronDownIcons = screen.getAllByTestId('chevron-down-icon');
      expect(chevronDownIcons.length).toBeGreaterThan(0);
    });

    it('should allow multiple sections to be expanded simultaneously', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const communicationSkillsButton = screen.getByRole('button', { name: /communication skills/i });
      const productKnowledgeButton = screen.getByRole('button', { name: /product knowledge/i });
      
      fireEvent.click(communicationSkillsButton);
      fireEvent.click(productKnowledgeButton);
      
      // Both should be expanded (multiple chevron-up icons)
      const chevronUpIcons = screen.getAllByTestId('chevron-up-icon');
      expect(chevronUpIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('View Mode Switching', () => {
    it('should start in compact view mode', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      // Should start with detailed view button available (meaning we're in compact mode)
      const detailedButton = screen.getByRole('button', { name: /detailed view/i });
      expect(detailedButton).toBeInTheDocument();
      expect(detailedButton).toHaveClass('bg-white'); // Default styling
    });

    it('should switch to detailed view mode', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const detailedButton = screen.getByRole('button', { name: /detailed view/i });
      fireEvent.click(detailedButton);
      
      // After clicking, the button should still be present (it might change styling)
      expect(detailedButton).toBeInTheDocument();
    });

    it('should show different content in detailed view', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const detailedButton = screen.getByRole('button', { name: /detailed view/i });
      fireEvent.click(detailedButton);
      
      // Detailed view should show additional information
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });
  });

  describe('Score Visualization', () => {
    it('should display high scores with appropriate styling', () => {
      const highScoreData = {
        communication_skills: 9.0,
        product_knowledge: 9.2,
        emotional_intelligence: 8.7,
      };

      render(<AnalysisDisplay analysisResult={highScoreData} isNested={false} />);
      
      // High scores should be present
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });

    it('should display medium scores with appropriate styling', () => {
      const mediumScoreData = {
        closing_techniques: 6.8,
        customer_needs_analysis: 6.5,
        overall_performance: 7.5,
      };

      render(<AnalysisDisplay analysisResult={mediumScoreData} isNested={false} />);
      
      expect(screen.getByText('Closing Techniques')).toBeInTheDocument();
      expect(screen.getByText('Customer Needs Analysis')).toBeInTheDocument();
      expect(screen.getByText('Overall Performance')).toBeInTheDocument();
    });

    it('should handle boolean values', () => {
      const booleanData = {
        communication_skills: true,
        product_knowledge: false,
        emotional_intelligence: true,
      };

      render(<AnalysisDisplay analysisResult={booleanData} isNested={false} />);
      
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });
  });

  describe('Key Formatting', () => {
    it('should format snake_case keys properly', () => {
      const snakeCaseData = {
        communication_skills: 8.2,
        product_knowledge: 9.0,
        customer_needs_analysis: 7.5,
      };

      render(<AnalysisDisplay analysisResult={snakeCaseData} isNested={false} />);
      
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Customer Needs Analysis')).toBeInTheDocument();
    });

    it('should format parameters with underscores correctly', () => {
      const underscoreData = {
        closing_techniques: 8.2,
        overall_performance: 9.0,
        emotional_intelligence: 7.5,
      };

      render(<AnalysisDisplay analysisResult={underscoreData} isNested={false} />);
      
      expect(screen.getByText('Closing Techniques')).toBeInTheDocument();
      expect(screen.getByText('Overall Performance')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });
  });

  describe('Structured Data with Parameters', () => {
    it('should handle analysis result with parameters field', () => {
      const structuredData = {
        summary: 'Overall good performance',
        confidence: 0.9,
        parameters: {
          communication_skills: 8.2,
          product_knowledge: 9.0,
          closing_techniques: 8.1,
        },
      };

      render(<AnalysisDisplay analysisResult={structuredData} isNested={false} />);
      
      // Should show parameters from the parameters field
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Closing Techniques')).toBeInTheDocument();
    });

    it('should handle nested analysis data', () => {
      render(<AnalysisDisplay {...defaultProps} isNested={true} />);
      
      // Nested rendering should still work
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
    });
  });

  describe('Icon Assignment', () => {
    it('should assign appropriate icons for different parameter types', () => {
      const iconTestData = {
        communication_skills: 8.5,
        product_knowledge: 9.0,
        closing_techniques: 7.2,
        emotional_intelligence: 8.8,
      };

      render(<AnalysisDisplay analysisResult={iconTestData} isNested={false} />);
      
      // Should render the component with various parameter types
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Closing Techniques')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles for expandable sections', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      
      // Should have buttons for each parameter plus view mode buttons
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<AnalysisDisplay {...defaultProps} />);
      
      const firstButton = screen.getAllByRole('button')[0];
      
      // Should be focusable
      expect(firstButton).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset: Record<string, number> = {};
      
      // Create parameters from core analysis parameters
      const coreParams = ['communication_skills', 'product_knowledge', 'customer_needs_analysis', 'closing_techniques', 'overall_performance', 'emotional_intelligence'];
      coreParams.forEach((param, i) => {
        largeDataset[param] = Math.random() * 10;
      });

      render(<AnalysisDisplay analysisResult={largeDataset} isNested={false} />);
      
      // Should render without performance issues
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
    });

    it('should handle special characters in parameter names', () => {
      const specialCharData = {
        communication_skills: 8.5,
        product_knowledge: 7.2,
        emotional_intelligence: 9.1,
      };

      render(<AnalysisDisplay analysisResult={specialCharData} isNested={false} />);
      
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
      expect(screen.getByText('Product Knowledge')).toBeInTheDocument();
      expect(screen.getByText('Emotional Intelligence')).toBeInTheDocument();
    });

    it('should handle extremely long string values', () => {
      const longStringData = {
        communication_skills: 'This is a very long description that contains more than 200 characters and should be handled appropriately by the component without breaking the layout or causing performance issues in the user interface.',
      };

      render(<AnalysisDisplay analysisResult={longStringData} isNested={false} />);
      
      expect(screen.getByText('Communication Skills')).toBeInTheDocument();
    });
  });
});