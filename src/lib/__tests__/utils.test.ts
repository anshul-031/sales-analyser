import {
  cn,
  formatFileSize,
  formatDuration,
  formatDate,
  isValidAudioFile,
  generateUniqueFilename,
  Logger,
  AppError,
  handleApiError,
  validateEmail,
  validateFileSize,
  getStatusColor,
  getStatusIcon,
  AdaptiveTimeout,
  GeminiCircuitBreaker,
} from '../utils'

// Mock constants
jest.mock('@/lib/constants', () => ({
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB - match the actual constant
  FILE_UPLOAD_CONFIG: {
    MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  },
}))

// Mock enums
jest.mock('@/types/enums', () => ({
  getAnalysisStatusColorClasses: jest.fn((status: string) => {
    if (status === 'COMPLETED') return 'text-green-600 bg-green-50'
    if (status === 'PROCESSING') return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }),
  getAnalysisStatusIcon: jest.fn((status: string) => {
    if (status === 'COMPLETED') return '✓'
    if (status === 'PROCESSING') return '⟳'
    return '○'
  }),
  isAnalysisCompleted: jest.fn(),
  isAnalysisProcessing: jest.fn(),
  isAnalysisPending: jest.fn(),
  isAnalysisFailed: jest.fn(),
  isAnalysisInProgress: jest.fn(),
  isAnalysisFinished: jest.fn(),
  normalizeAnalysisStatus: jest.fn(),
  getAnalysisStatusDisplayName: jest.fn(),
}))

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-200', 'p-4')
      expect(typeof result).toBe('string')
      expect(result).toContain('text-red-500')
    })

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class')
      expect(result).toContain('base-class')
      expect(result).toContain('conditional-class')
      expect(result).not.toContain('hidden-class')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(500)).toBe('500 Bytes')
    })

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB')
    })

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB')
    })
  })

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(45)).toBe('0:45')
      expect(formatDuration(5)).toBe('0:05')
    })

    it('should format minutes correctly', () => {
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(3661)).toBe('61:01')
    })

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0:00')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2023-12-25T10:30:00Z')
      const result = formatDate(date)
      
      // The exact format may vary by locale, but should contain key components
      expect(result).toMatch(/Dec/)
      expect(result).toMatch(/25/)
      expect(result).toMatch(/2023/)
    })

    it('should format current date', () => {
      const now = new Date()
      const result = formatDate(now)
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('isValidAudioFile', () => {
    it('should accept valid audio MIME types', () => {
      const validTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/aac',
        'audio/ogg',
        'audio/webm',
        'audio/flac',
        'audio/m4a',
        'audio/mp4'
      ]

      validTypes.forEach(type => {
        expect(isValidAudioFile(type)).toBe(true)
      })
    })

    it('should reject invalid MIME types', () => {
      const invalidTypes = [
        'video/mp4',
        'image/jpeg',
        'text/plain',
        'application/pdf',
        'audio/unknown',
        ''
      ]

      invalidTypes.forEach(type => {
        expect(isValidAudioFile(type)).toBe(false)
      })
    })

    it('should be case insensitive', () => {
      expect(isValidAudioFile('AUDIO/MPEG')).toBe(true)
      expect(isValidAudioFile('Audio/MP3')).toBe(true)
      expect(isValidAudioFile('AUDIO/WAV')).toBe(true)
    })
  })

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with timestamp', () => {
      const originalName = 'test-file.mp3'
      const result = generateUniqueFilename(originalName)
      
      expect(result).toMatch(/^test_file_\d+_[a-z0-9]+\.mp3$/)
    })

    it('should handle special characters in filename', () => {
      const originalName = 'test file with spaces & symbols!.wav'
      const result = generateUniqueFilename(originalName)
      
      expect(result).toMatch(/^test_file_with_spaces___symbols__\d+_[a-z0-9]+\.wav$/)
    })

    it('should preserve file extension', () => {
      const testCases = [
        'file.mp3',
        'document.pdf',
        'image.jpg',
        'video.mp4'
      ]

      testCases.forEach(filename => {
        const result = generateUniqueFilename(filename)
        const originalExt = filename.split('.').pop()
        expect(result).toMatch(new RegExp(`\\.${originalExt}$`))
      })
    })

    it('should generate different filenames for same input', () => {
      const originalName = 'test.mp3'
      const result1 = generateUniqueFilename(originalName)
      
      // Wait a bit to ensure different timestamp
      const result2 = generateUniqueFilename(originalName)
      
      expect(result1).not.toBe(result2)
    })
  })

  describe('Logger', () => {
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      process.env.LOG_LEVEL = 'debug'
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('should log error messages', () => {
      Logger.error('Test error message')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should format log messages correctly', () => {
      Logger.error('Test message')
      const callArgs = consoleSpy.mock.calls[0]
      expect(callArgs[0]).toMatch(/\[ERROR\].*Test message/)
    })

    it('should call debug logging when appropriate', () => {
      // Since the Logger uses default debug level, debug messages should be logged
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation()
      
      Logger.debug('Debug message')
      expect(debugSpy).toHaveBeenCalled()
      
      debugSpy.mockRestore()
    })
  })

  describe('AppError', () => {
    it('should create error with message and status code', () => {
      const error = new AppError('Test error', 400)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error).toBeInstanceOf(Error)
    })

    it('should have default status code', () => {
      const error = new AppError('Test error')
      expect(error.statusCode).toBe(500)
    })
  })

  describe('handleApiError', () => {
    it('should handle AppError instances', () => {
      const error = new AppError('Custom error', 400)
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Custom error',
        statusCode: 400
      })
    })

    it('should handle regular Error instances', () => {
      const error = new Error('Regular error')
      const result = handleApiError(error)
      
      expect(result).toEqual({
        message: 'Regular error',
        statusCode: 500
      })
    })

    it('should handle string errors', () => {
      const result = handleApiError('String error')
      
      expect(result).toEqual({
        message: 'Internal server error',
        statusCode: 500
      })
    })

    it('should handle unknown errors', () => {
      const result = handleApiError(null)
      
      expect(result).toEqual({
        message: 'Internal server error',
        statusCode: 500
      })
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@subdomain.example.org'
      ]

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.com',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      expect(validateFileSize(1024)).toBe(true) // 1KB
      expect(validateFileSize(5 * 1024 * 1024)).toBe(true) // 5MB
      expect(validateFileSize(100 * 1024 * 1024)).toBe(true) // 100MB
    })

    it('should reject files exceeding size limit', () => {
      expect(validateFileSize(250 * 1024 * 1024)).toBe(false) // 250MB (over 200MB limit)
    })

    it('should accept custom max size', () => {
      const customMax = 2 * 1024 * 1024 // 2MB
      expect(validateFileSize(1024 * 1024, customMax)).toBe(true) // 1MB
      expect(validateFileSize(3 * 1024 * 1024, customMax)).toBe(false) // 3MB
    })
  })

  describe('getStatusColor', () => {
    it('should return appropriate colors for different statuses', () => {
      // Test that the function exists and returns a string with color classes
      const result = getStatusColor('COMPLETED')
      expect(typeof result).toBe('string')
      expect(result).toContain('text-green-600 bg-green-50')
      
      const processingResult = getStatusColor('PROCESSING')
      expect(processingResult).toContain('text-blue-600 bg-blue-50')
    })
  })

  describe('getStatusIcon', () => {
    it('should return appropriate icons for different statuses', () => {
      // Test that the function exists and returns a string
      const result = getStatusIcon('COMPLETED')
      expect(typeof result).toBe('string')
      expect(result).toBe('✓')
      
      const processingResult = getStatusIcon('PROCESSING')
      expect(processingResult).toBe('⟳')
    })
  })

  describe('AdaptiveTimeout', () => {
    it('should create extendable timeout that can be extended', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await AdaptiveTimeout.createExtendableTimeout(
        promise, 100, 500, 'test operation'
      );
      expect(result).toBeUndefined();
    });

    it('should reject when max timeout is exceeded', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 1000)); // Long enough to trigger timeout
      
      await expect(
        AdaptiveTimeout.createExtendableTimeout(promise, 50, 200, 'timeout test')
      ).rejects.toThrow('timeout test exceeded maximum timeout of 200ms');
    });

    it('should create progressive timeout with progress logging', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      const promise = new Promise(resolve => setTimeout(resolve, 50));
      
      await AdaptiveTimeout.createProgressiveTimeout(promise, 200, 'progress test', 10);
      
      // Should have logged progress at least once
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ProgressiveTimeout] progress test progress:')
      );
      
      consoleSpy.mockRestore();
    });

    it('should create adaptive timeout using historical data', async () => {
      const promise = Promise.resolve('adaptive success');
      
      const result = await AdaptiveTimeout.createAdaptiveTimeout(promise, 100, 'adaptive test');
      expect(result).toBe('adaptive success');
    });

    it('should handle adaptive timeout rejection', async () => {
      const promise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('operation failed')), 100)
      );
      
      await expect(
        AdaptiveTimeout.createAdaptiveTimeout(promise, 50, 'adaptive timeout test')
      ).rejects.toThrow('adaptive timeout test timed out after');
    });
  });

  describe('GeminiCircuitBreaker', () => {
    let circuitBreaker: GeminiCircuitBreaker;

    beforeEach(() => {
      // Reset circuit breaker state
      circuitBreaker = new GeminiCircuitBreaker();
    });

    it('should execute operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation, 'test-op');
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should track failure count', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      try {
        await circuitBreaker.execute(operation, 'test-op');
      } catch (error: any) {
        expect(error.message).toBe('failure');
      }
      
      const state = circuitBreaker.getState();
      expect(state.failureCount).toBeGreaterThan(0);
    });

    it('should open circuit after threshold failures', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Exceed failure threshold
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-op');
        } catch (error) {
          // Expected failures
        }
      }
      
      const state = circuitBreaker.getState();
      expect(state.state).toBe('OPEN');
    });
  });

  describe('Logger - Advanced Features', () => {
    let consoleSpies: { [key: string]: jest.SpyInstance };

    beforeEach(() => {
      consoleSpies = {
        info: jest.spyOn(console, 'info').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation(),
      };
    });

    afterEach(() => {
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
    });

    it('should log warning messages', () => {
      Logger.warn('Test warning');
      expect(consoleSpies.warn).toHaveBeenCalled();
    });

    it('should log info messages', () => {
      Logger.info('Test info');
      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      Logger.debug('Test debug');
      expect(consoleSpies.debug).toHaveBeenCalled();
    });

    it('should log database messages', () => {
      Logger.database('Database operation completed');
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[DATABASE]')
      );
    });

    it('should log analysis messages', () => {
      Logger.analysis('Analysis completed');
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYSIS]')
      );
    });

    it('should log production messages', () => {
      Logger.production('info', 'Production info message');
      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      Logger.performance('test operation', 1500);
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test operation completed in 1500ms'),
        undefined
      );
    });

    it('should log slow operations as warnings', () => {
      Logger.performance('slow operation', 15000);
      expect(consoleSpies.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance: slow operation completed in 15000ms'),
        undefined
      );
    });

    it('should log monitoring messages', () => {
      Logger.monitor('System monitoring message');
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[MONITOR] System monitoring message')
      );
    });
  });
})
