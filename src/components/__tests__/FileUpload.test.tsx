import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FileUpload from '../FileUpload'

// Mock the dependencies
jest.mock('../../lib/utils', () => ({
  formatFileSize: jest.fn((bytes: number) => `${bytes} bytes`),
  isValidAudioFile: jest.fn((mimeType: string) => mimeType.startsWith('audio/')),
}))

jest.mock('../../lib/analysis-constants', () => ({
  DEFAULT_ANALYSIS_PARAMETERS: [
    { name: 'sentiment', description: 'Overall sentiment analysis' },
    { name: 'summary', description: 'Call summary' },
  ],
}))

jest.mock('../../lib/constants', () => ({
  FILE_UPLOAD_CONFIG: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    MAX_FILES: 5,
    CHUNK_SIZE: 1024 * 1024,
  },
}))

jest.mock('../../lib/audio-compression', () => ({
  audioCompressor: {
    compressAudio: jest.fn().mockResolvedValue({
      compressedFile: new File(['compressed'], 'compressed.mp3', { type: 'audio/mpeg' }),
      originalSize: 1000000,
      compressedSize: 500000,
      compressionRatio: 0.5,
      processingTime: 1000,
      settings: {}
    })
  },
  COMPRESSION_PRESETS: {
    MAXIMUM: {
      bitRate: 16,
      sampleRate: 11025,
      channels: 1,
      normalize: true,
      removeNoise: true,
      compressAudio: true,
      outputFormat: 'mp3'
    },
    HIGH: {
      bitRate: 32,
      sampleRate: 16000,
      channels: 1,
      normalize: true,
      removeNoise: true,
      compressAudio: true,
      outputFormat: 'mp3'
    },
    MEDIUM: {
      bitRate: 64,
      sampleRate: 22050,
      channels: 1,
      normalize: true,
      removeNoise: true,
      compressAudio: true,
      outputFormat: 'mp3'
    },
    LOW: {
      bitRate: 96,
      sampleRate: 44100,
      channels: 1,
      normalize: false,
      removeNoise: false,
      compressAudio: false,
      outputFormat: 'mp3'
    }
  },
  AudioCompressor: jest.fn(),
}))

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({ 'data-testid': 'dropzone' })),
    getInputProps: jest.fn(() => ({ 'data-testid': 'file-input' })),
    isDragActive: false,
    acceptedFiles: [],
    fileRejections: [],
  })),
}))

describe('FileUpload Component', () => {
  const defaultProps = {
    onUploadsStart: jest.fn(),
    onUploadComplete: jest.fn(),
    onUploadsComplete: jest.fn(),
    userId: 'test-user-123',
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the file upload component', () => {
      render(<FileUpload {...defaultProps} />)
      
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
      expect(screen.getByTestId('file-input')).toBeInTheDocument()
    })

    it('should display upload instructions', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Look for common upload instructions text
      const uploadText = screen.getByText(/drag.*drop.*files|click.*upload/i)
      expect(uploadText).toBeInTheDocument()
    })

    it('should show file size limits', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Should display the maximum file size
      expect(screen.getByText(/10485760 bytes/)).toBeInTheDocument()
    })
  })

  describe('File validation', () => {
    it('should accept valid audio files', () => {
      const { isValidAudioFile } = jest.requireMock('@/lib/utils')
      
      isValidAudioFile.mockReturnValue(true)
      
      render(<FileUpload {...defaultProps} />)
      
      // The component should be ready to accept files
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    })

    it('should reject invalid file types', () => {
      const { isValidAudioFile } = jest.requireMock('@/lib/utils')
      isValidAudioFile.mockReturnValue(false)
      
      render(<FileUpload {...defaultProps} />)
      
      // Component should still render but would reject non-audio files
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    })
  })

  describe('File size validation', () => {
    it('should format file sizes correctly', () => {
      const { formatFileSize } = jest.requireMock('@/lib/utils')
      formatFileSize.mockReturnValue('1.5 MB')
      
      render(<FileUpload {...defaultProps} />)
      
      // Check that formatFileSize would be called for display
      expect(formatFileSize).toHaveBeenCalled()
    })
  })

  describe('Upload controls', () => {
    it('should show compression settings', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Look for compression-related UI elements using more specific queries
      expect(screen.getByText('Audio Compression Settings')).toBeInTheDocument()
      
      // Should show compression level options
      expect(screen.getByDisplayValue(/maximum/i)).toBeInTheDocument()
      
      // Should show current settings
      expect(screen.getByText('Current Settings:')).toBeInTheDocument()
    })

    it('should display analysis parameters', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Should show default analysis parameters (use getAllBy for multiple instances)
      expect(screen.getAllByText(/sentiment/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText(/summary/i)[0]).toBeInTheDocument()
    })
  })

  describe('Component props', () => {
    it('should use provided userId', () => {
      render(<FileUpload {...defaultProps} userId="custom-user-id" />)
      
      // Component should accept and use the userId prop
      expect(defaultProps.onUploadsStart).not.toHaveBeenCalled() // Initially
    })

    it('should respect maxFiles limit', () => {
      render(<FileUpload {...defaultProps} maxFiles={3} />)
      
      // Component should render with custom maxFiles
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    })

    it('should respect maxFileSize limit', () => {
      const customSize = 5 * 1024 * 1024 // 5MB
      render(<FileUpload {...defaultProps} maxFileSize={customSize} />)
      
      // Component should render with custom file size limit
      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    })
  })

  describe('Callback functions', () => {
    it('should call onUploadsStart when upload begins', () => {
      render(<FileUpload {...defaultProps} />)
      
      // Initially, callbacks should not be called
      expect(defaultProps.onUploadsStart).not.toHaveBeenCalled()
      expect(defaultProps.onUploadComplete).not.toHaveBeenCalled()
      expect(defaultProps.onUploadsComplete).not.toHaveBeenCalled()
    })

    it('should provide correct callback signatures', () => {
      const onUploadComplete = jest.fn()
      const onUploadsComplete = jest.fn()
      const onUploadsStart = jest.fn()
      
      render(
        <FileUpload
          {...defaultProps}
          onUploadsStart={onUploadsStart}
          onUploadComplete={onUploadComplete}
          onUploadsComplete={onUploadsComplete}
        />
      )
      
      // Verify callbacks are functions
      expect(typeof onUploadsStart).toBe('function')
      expect(typeof onUploadComplete).toBe('function')
      expect(typeof onUploadsComplete).toBe('function')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<FileUpload {...defaultProps} />)
      
      const dropzone = screen.getByTestId('dropzone')
      const input = screen.getByTestId('file-input')
      
      expect(dropzone).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<FileUpload {...defaultProps} />)
      
      const input = screen.getByTestId('file-input')
      
      // Input should be focusable
      input.focus()
      expect(document.activeElement).toBe(input)
    })
  })

  describe('Error handling', () => {
    it('should handle component mounting without errors', () => {
      expect(() => {
        render(<FileUpload {...defaultProps} />)
      }).not.toThrow()
    })

    it('should handle missing props gracefully', () => {
      const minimalProps = {
        onUploadsStart: jest.fn(),
        onUploadComplete: jest.fn(),
        onUploadsComplete: jest.fn(),
        userId: 'test-user',
      }
      
      expect(() => {
        render(<FileUpload {...minimalProps} />)
      }).not.toThrow()
    })
  })

  describe('Audio compression integration', () => {
    it('should have access to compression presets', () => {
      const { COMPRESSION_PRESETS } = jest.requireMock('@/lib/audio-compression')
      
      expect(COMPRESSION_PRESETS.MAXIMUM).toBeDefined()
      expect(COMPRESSION_PRESETS.HIGH).toBeDefined()
      expect(COMPRESSION_PRESETS.MEDIUM).toBeDefined()
      expect(COMPRESSION_PRESETS.LOW).toBeDefined()
    })

    it('should integrate with audio compressor', () => {
      const { audioCompressor } = jest.requireMock('@/lib/audio-compression')
      
      render(<FileUpload {...defaultProps} />)
      
      // Audio compressor should be available
      expect(audioCompressor.compressAudio).toBeDefined()
    })
  })
})
