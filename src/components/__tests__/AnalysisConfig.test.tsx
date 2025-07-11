import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisConfig from '../AnalysisConfig';

// Mock the analysis constants
jest.mock('@/lib/analysis-constants', () => ({
  DEFAULT_ANALYSIS_PARAMETERS: [
    {
      id: 'sentiment',
      name: 'Sentiment Analysis',
      description: 'Analyze call sentiment',
      prompt: 'Analyze sentiment',
      enabled: true,
    },
  ],
}));

describe('AnalysisConfig', () => {
  const mockOnAnalysisStart = jest.fn();
  const mockUploadedFiles = [
    { id: 'file-1', originalName: 'test1.mp3', uploadedAt: '2024-01-01' },
    { id: 'file-2', originalName: 'test2.mp3', uploadedAt: '2024-01-02' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch globally
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render analysis config component', () => {
    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    expect(screen.getByText(/configure analysis/i)).toBeInTheDocument();
    expect(screen.getByText('test1.mp3')).toBeInTheDocument();
    expect(screen.getByText('test2.mp3')).toBeInTheDocument();
  });

  it('should handle file selection', () => {
    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    const fileCheckbox = screen.getByRole('checkbox', { name: /test1.mp3/i });
    fireEvent.click(fileCheckbox);

    expect(fileCheckbox).toBeChecked();
  });

  it('should handle select all files', () => {
    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    const selectAllButton = screen.getByRole('button', { name: /^select all$/i });
    fireEvent.click(selectAllButton);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      if (checkbox.getAttribute('aria-label')?.includes('.mp3')) {
        expect(checkbox).toBeChecked();
      }
    });
  });

  it('should handle analysis type change', () => {
    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    const customRadio = screen.getByRole('radio', { name: /custom analysis/i });
    fireEvent.click(customRadio);

    expect(customRadio).toBeChecked();
    expect(screen.getByPlaceholderText(/describe how you want the sales call to be analyzed/i)).toBeInTheDocument();
  });

  it('should show error when no files are selected', async () => {
    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    const startButton = screen.getByRole('button', { name: /analyze 0 files/i });
    expect(startButton).toBeDisabled();
  });

  it('should start analysis with selected files', async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        analyses: [{ id: 'analysis-1' }],
      }),
    });

    render(
      <AnalysisConfig
        uploadedFiles={mockUploadedFiles}
        userId="user-1"
        onAnalysisStart={mockOnAnalysisStart}
      />
    );

    // Select a file
    const fileCheckbox = screen.getByRole('checkbox', { name: /test1.mp3/i });
    fireEvent.click(fileCheckbox);

    // Start analysis
    const startButton = screen.getByRole('button', { name: /analyze/i });
    fireEvent.click(startButton);

    expect(mockFetch).toHaveBeenCalledWith('/api/analyze', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('file-1'),
    }));
  });
});
