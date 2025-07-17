import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AudioCompressionDemo from '../page';

// Mock the audio compression library
jest.mock('@/lib/audio-compression', () => ({
  audioCompressor: {
    compressAudio: jest.fn()
  },
  COMPRESSION_PRESETS: {
    MAXIMUM: { bitRate: 16, channels: 1, sampleRate: 11000, outputFormat: 'mp3' },
    HIGH: { bitRate: 32, channels: 1, sampleRate: 16000, outputFormat: 'mp3' },
    MEDIUM: { bitRate: 64, channels: 1, sampleRate: 22000, outputFormat: 'mp3' },
    LOW: { bitRate: 96, channels: 1, sampleRate: 44000, outputFormat: 'mp3' }
  },
  AudioCompressor: {
    estimateCompressionRatio: jest.fn().mockReturnValue(0.75)
  }
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  formatFileSize: jest.fn((size: number) => `${(size / 1024).toFixed(1)} KB`)
}));

// Mock window.URL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
});

describe('AudioCompressionDemo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  it('renders the compression demo page correctly', () => {
    render(<AudioCompressionDemo />);
    
    expect(screen.getByText('🎵 Audio Compression Demo')).toBeInTheDocument();
    expect(screen.getByText('Test the advanced audio compression system with maximum compression settings')).toBeInTheDocument();
    expect(screen.getByText('Select Audio File')).toBeInTheDocument();
    expect(screen.getByText('Compression Results')).toBeInTheDocument();
  });

  it('displays file upload area', () => {
    render(<AudioCompressionDemo />);
    
    expect(screen.getByText('Click to select an audio file')).toBeInTheDocument();
    expect(screen.getByText('Supported: MP3, WAV, M4A, AAC, OGG, FLAC, WebM')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<AudioCompressionDemo />);
    
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    // Find the actual input element
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Mock the file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('Selected File')).toBeInTheDocument();
      expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
    });
  });

  it('shows compression settings when file is selected', async () => {
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('Compression Settings')).toBeInTheDocument();
      expect(screen.getByText('Compression Preset')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /compress audio/i })).toBeInTheDocument();
    });
  });

  it('handles compression preset selection', async () => {
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      const select = screen.getByDisplayValue('Maximum (16kbps, mono, 11kHz)');
      fireEvent.change(select, { target: { value: 'HIGH' } });
      expect(select).toHaveValue('HIGH');
    });
  });

  it('handles compression error', async () => {
    const { audioCompressor } = require('@/lib/audio-compression');
    audioCompressor.compressAudio.mockRejectedValue(new Error('Compression failed'));
    
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      const compressButton = screen.getByRole('button', { name: /compress audio/i });
      fireEvent.click(compressButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Compression failed')).toBeInTheDocument();
    });
  });

  it('handles successful compression', async () => {
    const { audioCompressor } = require('@/lib/audio-compression');
    const mockResult = {
      originalSize: 1000000,
      compressedSize: 250000,
      compressionRatio: 0.75,
      processingTime: 1500,
      settings: {
        bitRate: 16,
        sampleRate: 11000,
        channels: 1,
        outputFormat: 'mp3'
      },
      compressedFile: new File(['compressed'], 'compressed.mp3', { type: 'audio/mp3' })
    };
    
    audioCompressor.compressAudio.mockResolvedValue(mockResult);
    
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      const compressButton = screen.getByRole('button', { name: /compress audio/i });
      fireEvent.click(compressButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('✅ Compression Successful!')).toBeInTheDocument();
      expect(screen.getByText('Compressed Audio')).toBeInTheDocument();
      expect(screen.getByText('Download Compressed File')).toBeInTheDocument();
    });
  });

  it('displays technical details section', () => {
    render(<AudioCompressionDemo />);
    
    expect(screen.getByText('🔧 Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Audio Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Compression Presets')).toBeInTheDocument();
    expect(screen.getByText('Load and decode audio using Web Audio API')).toBeInTheDocument();
  });

  it('shows processing state during compression', async () => {
    const { audioCompressor } = require('@/lib/audio-compression');
    
    // Mock a delayed response
    audioCompressor.compressAudio.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      const compressButton = screen.getByRole('button', { name: /compress audio/i });
      fireEvent.click(compressButton);
    });
    
    // Check for processing state
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
  });

  it('displays empty state when no results', () => {
    render(<AudioCompressionDemo />);
    
    expect(screen.getByText('Select and compress an audio file to see results')).toBeInTheDocument();
  });

  it('shows estimated compression results', async () => {
    render(<AudioCompressionDemo />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['audio content'], 'test-audio.mp3', { type: 'audio/mp3' });
    
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('Estimated Results')).toBeInTheDocument();
      expect(screen.getByText('Reduction: 75.0%')).toBeInTheDocument();
    });
  });
});
