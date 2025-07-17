import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SwaggerPage from '../page';

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock fetch globally
(global as any).fetch = jest.fn();

// Mock console.error to suppress expected error messages
const mockConsoleError = jest.fn();
const originalConsoleError = console.error;

describe('SwaggerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global as any).fetch.mockClear();
    // Mock console.error
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
  });

  it('should render loading state initially', () => {
    // Mock fetch to never resolve to test loading state
    (global as any).fetch.mockImplementation(() => new Promise(() => {}));
    
    render(<SwaggerPage />);
    
    expect(screen.getByText('Loading API Documentation...')).toBeInTheDocument();
    // Test that the spinner animation class is present
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render swagger documentation successfully', async () => {
    const mockSpecData = {
      openapi: '3.0.0',
      info: { title: 'AI Call Analyser API', version: '1.0.0' },
      paths: {}
    };

    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('AI Call Analyser API')).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    (global as any).fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('AI Call Analyser API')).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Failed to load API specification:',
      expect.any(Error)
    );
  });

  it('should handle API response error', async () => {
    (global as any).fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('AI Call Analyser API')).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalledWith(
      'Failed to load API specification:',
      expect.any(Error)
    );
  });

  it('should copy curl command to clipboard', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    // First expand an endpoint to see the Copy cURL button
    const endpointButton = screen.getByText('User Authentication');
    fireEvent.click(endpointButton);

    await waitFor(() => {
      const copyButton = screen.getByText('Copy cURL');
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should expand and collapse endpoint details', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    // Find an endpoint button and click it
    const endpointButton = screen.getByText('User Authentication');
    fireEvent.click(endpointButton);

    // Should now show details
    await waitFor(() => {
      expect(screen.getByText('Authenticate user with email and password to receive JWT token')).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(endpointButton);

    await waitFor(() => {
      expect(screen.queryByText('Authenticate user with email and password to receive JWT token')).not.toBeInTheDocument();
    });
  });

  it('should handle clipboard copy failure', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    // Mock clipboard to reject
    const mockWriteText = navigator.clipboard.writeText as jest.MockedFunction<typeof navigator.clipboard.writeText>;
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard error'));

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    // Expand an endpoint first
    const endpointButton = screen.getByText('User Authentication');
    fireEvent.click(endpointButton);

    await waitFor(() => {
      const copyButton = screen.getByText('Copy cURL');
      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('should render API endpoints section', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    // Should show individual endpoints
    expect(screen.getByText('User Authentication')).toBeInTheDocument();
    expect(screen.getByText('User Registration')).toBeInTheDocument();
    expect(screen.getByText('Upload Audio Files')).toBeInTheDocument();
    expect(screen.getByText('Analyze Audio Files')).toBeInTheDocument();
    expect(screen.getByText('AI Chat Query')).toBeInTheDocument();
    expect(screen.getByText('Get Analytics Data')).toBeInTheDocument();
  });

  it('should copy OpenAPI spec URL to clipboard', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    const openApiSpecButton = screen.getByText('OpenAPI Spec');
    fireEvent.click(openApiSpecButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/api/swagger.json')
    );
  });

  it('should display method badges with correct colors', async () => {
    const mockSpecData = { openapi: '3.0.0', info: { title: 'Test API' }, paths: {} };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSpecData),
    });

    render(<SwaggerPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading API Documentation...')).not.toBeInTheDocument();
    });

    // Check that method badges are displayed
    const postBadges = screen.getAllByText('POST');
    const getBadges = screen.getAllByText('GET');
    
    expect(postBadges.length).toBeGreaterThan(0);
    expect(getBadges.length).toBeGreaterThan(0);
  });
});
