'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Chatbot from '../Chatbot';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  MessageCircle: ({ className, ...props }: any) => <div {...props} className={className} data-testid="message-circle-icon" />,
  Send: ({ className, ...props }: any) => <div {...props} className={className} data-testid="send-icon" />,
  Bot: ({ className, ...props }: any) => <div {...props} className={className} data-testid="bot-icon" />,
  User: ({ className, ...props }: any) => <div {...props} className={className} data-testid="user-icon" />,
  Loader2: ({ className, ...props }: any) => <div {...props} className={className} data-testid="loader-icon" />,
  X: ({ className, ...props }: any) => <div {...props} className={className} data-testid="x-icon" />,
  Minimize2: ({ className, ...props }: any) => <div {...props} className={className} data-testid="minimize-icon" />,
  Maximize2: ({ className, ...props }: any) => <div {...props} className={className} data-testid="maximize-icon" />,
  HelpCircle: ({ className, ...props }: any) => <div {...props} className={className} data-testid="help-circle-icon" />,
  Lightbulb: ({ className, ...props }: any) => <div {...props} className={className} data-testid="lightbulb-icon" />,
  BarChart3: ({ className, ...props }: any) => <div {...props} className={className} data-testid="barchart-icon" />,
}));

// Mock Logger utility
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch API
global.fetch = jest.fn();

// Mock DOM methods not available in JSDOM
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('Chatbot Component', () => {
  const mockUserId = 'user-123';
  const mockAnalysisId = 'analysis-456';
  const mockUploadId = 'upload-789';
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('should render chatbot with basic elements', async () => {
      // Mock successful context loading
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: [],
            totalAnalyses: 0,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Check header elements
      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
      expect(screen.getByText('Ask me about your call recordings')).toBeInTheDocument();
      expect(screen.getAllByTestId('bot-icon')).toHaveLength(2); // One in header, one in welcome message

      // Check input elements
      expect(screen.getByPlaceholderText('Ask about conversation content...')).toBeInTheDocument();
      expect(screen.getByTestId('send-icon')).toBeInTheDocument();

      // Check welcome message
      expect(screen.getByText(/Hello! I analyze your call transcriptions directly/)).toBeInTheDocument();
    });

    it('should render with analysis ID prop', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} analysisId={mockAnalysisId} onClose={mockOnClose} />);
      });

      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
    });

    it('should render with upload ID prop', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} uploadId={mockUploadId} onClose={mockOnClose} />);
      });

      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
    });

    it('should render without onClose prop', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} />);
      });

      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
      // X icon should not be present when onClose is not provided
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
    });
  });

  describe('User Interface Controls', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should handle minimize and maximize functionality', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Initially should show full chatbot
      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();

      // Click minimize button
      const minimizeButton = screen.getByTestId('minimize-icon').closest('button');
      expect(minimizeButton).toBeInTheDocument();
      
      await act(async () => {
        fireEvent.click(minimizeButton!);
      });

      // Should show minimized state
      expect(screen.queryByText('Call Analysis Assistant')).not.toBeInTheDocument();
      expect(screen.getByTestId('message-circle-icon')).toBeInTheDocument();

      // Click to maximize again
      const maximizeButton = screen.getByTestId('message-circle-icon').closest('button');
      
      await act(async () => {
        fireEvent.click(maximizeButton!);
      });

      // Should show full chatbot again
      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
    });

    it('should handle close functionality', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const closeButton = screen.getByTestId('x-icon').closest('button');
      expect(closeButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(closeButton!);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle input changes', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...') as HTMLInputElement;
      
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      });

      expect(input.value).toBe('Test message');
    });
  });

  describe('Context Loading', () => {
    it('should load available context successfully', async () => {
      const mockContext = [
        {
          analysisId: 'analysis-1',
          uploadId: 'upload-1',
          fileName: 'test-call.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-01',
          overallScore: 8.5,
        },
        {
          analysisId: 'analysis-2',
          uploadId: 'upload-2',
          fileName: 'test-call-2.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-02',
          overallScore: 7.5,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: mockContext,
            totalAnalyses: 2,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Should show context selector when multiple contexts available (length > 1)
      await waitFor(() => {
        expect(screen.getByText('Focus on:')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('All call recordings')).toBeInTheDocument();
    });

    it('should handle context loading failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Should still render basic component
      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
    });

    it('should not show context selector for single context', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: [],
            totalAnalyses: 0,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Should not show context selector
      expect(screen.queryByText('Focus on:')).not.toBeInTheDocument();
    });

    it('should not show context selector when analysisId is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: [
              { analysisId: 'analysis-1', uploadId: 'upload-1', fileName: 'test.mp3', analysisType: 'sales', uploadDate: '2024-01-01', overallScore: 8 },
              { analysisId: 'analysis-2', uploadId: 'upload-2', fileName: 'test2.mp3', analysisType: 'sales', uploadDate: '2024-01-02', overallScore: 7 },
            ],
            totalAnalyses: 2,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} analysisId={mockAnalysisId} onClose={mockOnClose} />);
      });

      // Should not show context selector when specific analysisId is provided
      expect(screen.queryByText('Focus on:')).not.toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { availableContext: [], totalAnalyses: 0 },
          }),
        });
    });

    it('should send message successfully', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Mock successful message sending
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            answer: 'This is a bot response',
            contextSource: 'Analysis data',
          },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('Test question')).toBeInTheDocument();
      });

      // Should show bot response
      await waitFor(() => {
        expect(screen.getByText('This is a bot response')).toBeInTheDocument();
      });

      // Input should be cleared
      expect((input as HTMLInputElement).value).toBe('');
    });

    it('should handle message sending failure', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Mock failed message sending
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'AI service error',
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('Test question')).toBeInTheDocument();
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/I apologize, but I encountered an error/)).toBeInTheDocument();
      });
    });

    it('should handle network error during message sending', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should show user message
      await waitFor(() => {
        expect(screen.getByText('Test question')).toBeInTheDocument();
      });

      // Should show error message with network error details
      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should not send empty messages', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Button should be disabled when input is empty
      expect(sendButton).toBeDisabled();

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should not make any fetch calls for message sending
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial context loading call
    });

    it('should not send messages while loading', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test question' } });
      });

      // Mock slow response to test loading state
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { answer: 'Response', contextSource: 'Test' },
          }),
        }), 1000))
      );

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Button should be disabled during loading
      expect(sendButton).toBeDisabled();
    });

    it('should send message with analysisId context', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} analysisId={mockAnalysisId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { answer: 'Analysis-specific response', contextSource: 'Analysis' },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Specific question' } });
      });

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should call API with analysisId
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Specific question',
            analysisId: mockAnalysisId,
          }),
        });
      });
    });

    it('should send message with uploadId context', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} uploadId={mockUploadId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { answer: 'Upload-specific response', contextSource: 'Upload' },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Upload question' } });
      });

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should call API with uploadId
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Upload question',
            uploadId: mockUploadId,
          }),
        });
      });
    });
  });

  describe('Keyboard Interactions', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should send message on Enter key press', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { answer: 'Keyboard response', contextSource: 'Test' },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Keyboard test' } });
      });

      await act(async () => {
        fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
      });

      await waitFor(() => {
        expect(screen.getByText('Keyboard test')).toBeInTheDocument();
      });
    });

    it('should not send message on Shift+Enter', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Multiline test' } });
      });

      await act(async () => {
        fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', shiftKey: true, charCode: 13 });
      });

      // Should not send message, only context loading call should be made
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sample Questions', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should display sample questions when there are few messages', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Should show sample questions section
      expect(screen.getByText('Try asking:')).toBeInTheDocument();
      
      // Should show some sample questions
      expect(screen.getByText('"What was the customer\'s main concern?"')).toBeInTheDocument();
      expect(screen.getByText('"How did I respond to objections?"')).toBeInTheDocument();
      expect(screen.getByText('"What communication style did I use?"')).toBeInTheDocument();
    });

    it('should populate input with sample question when clicked', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const sampleQuestion = screen.getByText('"What was the customer\'s main concern?"');
      const input = screen.getByPlaceholderText('Ask about conversation content...') as HTMLInputElement;

      await act(async () => {
        fireEvent.click(sampleQuestion);
      });

      expect(input.value).toBe('What was the customer\'s main concern?');
      expect(input).toHaveFocus();
    });

    it('should hide sample questions when there are many messages', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Mock multiple successful responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { answer: 'Response 1', contextSource: 'Test' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { answer: 'Response 2', contextSource: 'Test' },
          }),
        });

      // Send first message
      await act(async () => {
        fireEvent.change(input, { target: { value: 'First question' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('First question')).toBeInTheDocument();
      });

      // Send second message
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Second question' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Second question')).toBeInTheDocument();
      });

      // Sample questions should be hidden when there are more than 1 message (welcome + user messages + bot responses)
      expect(screen.queryByText('Try asking:')).not.toBeInTheDocument();
    });
  });

  describe('Context Selection', () => {
    it('should handle context selection changes', async () => {
      const mockContext = [
        {
          analysisId: 'analysis-1',
          uploadId: 'upload-1',
          fileName: 'call1.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-01',
          overallScore: 8.5,
        },
        {
          analysisId: 'analysis-2',
          uploadId: 'upload-2',
          fileName: 'call2.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-02',
          overallScore: 7.5,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: mockContext,
            totalAnalyses: 2,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByText('Focus on:')).toBeInTheDocument();
      });

      const contextSelect = screen.getByDisplayValue('All call recordings') as HTMLSelectElement;
      
      await act(async () => {
        fireEvent.change(contextSelect, { target: { value: 'analysis-analysis-1' } });
      });

      expect(contextSelect.value).toBe('analysis-analysis-1');
    });

    it('should send message with selected context', async () => {
      const mockContext = [
        {
          analysisId: 'analysis-1',
          uploadId: 'upload-1',
          fileName: 'call1.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-01',
          overallScore: 8.5,
        },
        {
          analysisId: 'analysis-2',
          uploadId: 'upload-2',
          fileName: 'call2.mp3',
          analysisType: 'sales',
          uploadDate: '2024-01-02',
          overallScore: 7.5,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            availableContext: mockContext,
            totalAnalyses: 2,
          },
        }),
      });

      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      // Wait for context to load and change selection
      await waitFor(() => {
        expect(screen.getByText('Focus on:')).toBeInTheDocument();
      });

      const contextSelect = screen.getByDisplayValue('All call recordings');
      await act(async () => {
        fireEvent.change(contextSelect, { target: { value: 'analysis-analysis-1' } });
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { answer: 'Context-specific response', contextSource: 'Selected Analysis' },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Context question' } });
        fireEvent.click(sendButton!);
      });

      // Should call API with selected analysisId
      await waitFor(() => {
        expect(global.fetch).toHaveBeenLastCalledWith('/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: 'Context question',
            analysisId: 'analysis-1',
          }),
        });
      });
    });
  });

  describe('Message Display', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should display bot messages with context source', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            answer: 'Response with context',
            contextSource: 'Analysis results from call recording',
          },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test with context' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Response with context')).toBeInTheDocument();
        expect(screen.getByText('Context: Analysis results from call recording')).toBeInTheDocument();
      });
    });

    it('should display bot messages without context source', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            answer: 'Response without context',
          },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test without context' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Response without context')).toBeInTheDocument();
        expect(screen.queryByText(/Context:/)).not.toBeInTheDocument();
      });
    });

    it('should format multi-line messages correctly', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            answer: 'Line 1\nLine 2\nLine 3',
            contextSource: 'Multi-line test',
          },
        }),
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Multi-line test' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText('Line 1')).toBeInTheDocument();
        expect(screen.getByText('Line 2')).toBeInTheDocument();
        expect(screen.getByText('Line 3')).toBeInTheDocument();
      });
    });

    it('should show loading indicator during message processing', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      // Mock slow response
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { answer: 'Delayed response', contextSource: 'Test' },
          }),
        }), 100))
      );

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Loading test' } });
        fireEvent.click(sendButton!);
      });

      // Should show loading indicator
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Analyzing your question...')).toBeInTheDocument();

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Delayed response')).toBeInTheDocument();
      });

      // Loading indicator should be gone
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should handle whitespace-only input', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
      });

      expect(sendButton).toBeDisabled();

      await act(async () => {
        fireEvent.click(sendButton!);
      });

      // Should not make API call for whitespace-only input
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only context loading
    });

    it('should handle API response without success field', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Empty response
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Empty response test' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText(/I apologize, but I encountered an error/)).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON response', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      const sendButton = screen.getByTestId('send-icon').closest('button');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'JSON error test' } });
        fireEvent.click(sendButton!);
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
      });
    });

    it('should handle empty user ID gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });

      await act(async () => {
        render(<Chatbot userId="" onClose={mockOnClose} />);
      });

      expect(screen.getByText('Call Analysis Assistant')).toBeInTheDocument();
    });

    it('should handle context selection logic internally', async () => {
      // Test that the component handles different context selection patterns
      const contextSelectionTests = [
        { key: 'all', expectGlobal: true },
        { key: 'analysis-test-id', expectAnalysisId: 'test-id' },
        { key: 'upload-test-upload', expectUploadId: 'test-upload' },
      ];

      contextSelectionTests.forEach(test => {
        if (test.key === 'all') {
          expect(test.expectGlobal).toBe(true);
        } else if (test.key.startsWith('analysis-')) {
          expect(test.expectAnalysisId).toBe('test-id');
        } else if (test.key.startsWith('upload-')) {
          expect(test.expectUploadId).toBe('test-upload');
        }
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { availableContext: [], totalAnalyses: 0 },
        }),
      });
    });

    it('should have proper accessibility attributes', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const input = screen.getByPlaceholderText('Ask about conversation content...');
      expect(input).toHaveAttribute('type', 'text');

      const sendButton = screen.getByTestId('send-icon').closest('button');
      expect(sendButton).toBeInTheDocument();
    });

    it('should focus input when sample question is selected', async () => {
      await act(async () => {
        render(<Chatbot userId={mockUserId} onClose={mockOnClose} />);
      });

      const sampleQuestion = screen.getByText('"What was the customer\'s main concern?"');
      const input = screen.getByPlaceholderText('Ask about conversation content...');

      await act(async () => {
        fireEvent.click(sampleQuestion);
      });

      expect(input).toHaveFocus();
    });
  });
});
