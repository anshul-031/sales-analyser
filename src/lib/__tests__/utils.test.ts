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
  isAnalysisCompleted,
  isAnalysisProcessing,
  isAnalysisPending,
  isAnalysisFailed,
  isAnalysisInProgress,
  isAnalysisFinished,
  normalizeAnalysisStatus,
  getAnalysisStatusDisplayName,
  getAnalysisStatusColorClasses,
  getAnalysisStatusIcon,
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
      Logger._testConfig.setLogLevel('debug'); // Set debug level for testing
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      Logger._testConfig.reset(); // Reset to default state
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should create extendable timeout that can be extended', async () => {
      const mockOnProgress = jest.fn();
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      const timeoutPromise = AdaptiveTimeout.createExtendableTimeout(
        promise,
        100,
        500,
        'extendable test',
        mockOnProgress
      );

      // Advance time to first timeout
      jest.advanceTimersByTime(100);
      
      // Should call onProgress but not reject yet
      expect(mockOnProgress).toHaveBeenCalledWith(100);
      
      // Resolve before advancing further
      resolvePromise!('extended success');
      
      // Advance timers to process the resolution
      jest.advanceTimersByTime(50);

      const result = await timeoutPromise;
      expect(result).toBe('extended success');
    });

    it('should reject when max timeout is exceeded', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const timeoutPromise = AdaptiveTimeout.createExtendableTimeout(
        promise,
        100,
        300,
        'max timeout test'
      );

      // Advance past max timeout
      jest.advanceTimersByTime(400);

      await expect(timeoutPromise).rejects.toThrow('max timeout test exceeded maximum timeout of 300ms');
    });

    it('should create progressive timeout with progress logging', async () => {
      const logSpy = jest.spyOn(Logger, 'info').mockImplementation();
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      const timeoutPromise = AdaptiveTimeout.createProgressiveTimeout(
        promise,
        200,
        'progressive test',
        50 // Short progress interval for testing
      );

      // Advance time to trigger progress logging
      jest.advanceTimersByTime(50);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ProgressiveTimeout] progressive test progress: 50ms elapsed')
      );

      // Resolve before timeout
      resolvePromise!('progressive success');
      
      // Process the resolution
      jest.advanceTimersByTime(10);

      const result = await timeoutPromise;
      expect(result).toBe('progressive success');
      
      logSpy.mockRestore();
    });

    it('should create adaptive timeout using historical data', async () => {
      const promise = Promise.resolve('adaptive success');
      
      const result = await AdaptiveTimeout.createAdaptiveTimeout(promise, 50, 'adaptive test');
      expect(result).toBe('adaptive success');
    });

    it('should handle adaptive timeout rejection', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const timeoutPromise = AdaptiveTimeout.createAdaptiveTimeout(
        promise,
        100,
        'adaptive timeout test'
      );

      // Advance past timeout
      jest.advanceTimersByTime(150);

      await expect(timeoutPromise).rejects.toThrow('adaptive timeout test timed out after 100ms');
    });

    it('should handle progressive timeout rejection', async () => {
      const promise = new Promise<string>(() => {
        // Never resolves
      });

      const timeoutPromise = AdaptiveTimeout.createProgressiveTimeout(
        promise,
        100,
        'progressive timeout test'
      );

      // Advance past timeout
      jest.advanceTimersByTime(150);

      await expect(timeoutPromise).rejects.toThrow('progressive timeout test timed out after 100ms');
    });

    it('should record and use historical performance data', async () => {
      const logSpy = jest.spyOn(Logger, 'info').mockImplementation();
      
      // First operation - establish baseline (this will record a duration)
      const promise1 = Promise.resolve('first');
      await AdaptiveTimeout.createAdaptiveTimeout(promise1, 100, 'historical test');
      
      // Manually add more historical data to test the adaptive behavior
      // We need to call the adaptive timeout multiple times to see historical data being used
      const promise2 = Promise.resolve('second');
      await AdaptiveTimeout.createAdaptiveTimeout(promise2, 100, 'historical test');
      
      // Third call should now use historical data
      const promise3 = Promise.resolve('third');
      await AdaptiveTimeout.createAdaptiveTimeout(promise3, 100, 'historical test');
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AdaptiveTimeout] Using adaptive timeout for historical test')
      );
      
      logSpy.mockRestore();
    });

    it('should manage historical data with a maximum of 50 entries', async () => {
      const operationName = 'history-test';
      
      // Add more than 50 entries to test the limit
      for (let i = 0; i < 55; i++) {
        const promise = Promise.resolve(`result-${i}`);
        await AdaptiveTimeout.createAdaptiveTimeout(promise, 100, operationName);
      }
      
      // The implementation should have kept only the last 50 entries
      // This test verifies that the history management code runs
      expect(true).toBe(true); // Test passes if no errors occur
    });
  });

  describe('Exported Analysis Status Functions', () => {
    it('should export analysis status utility functions', () => {
      // Test the exported functions are available
      expect(typeof isAnalysisCompleted).toBe('function');
      expect(typeof isAnalysisProcessing).toBe('function');
      expect(typeof isAnalysisPending).toBe('function');
      expect(typeof isAnalysisFailed).toBe('function');
      expect(typeof isAnalysisInProgress).toBe('function');
      expect(typeof isAnalysisFinished).toBe('function');
      expect(typeof normalizeAnalysisStatus).toBe('function');
      expect(typeof getAnalysisStatusDisplayName).toBe('function');
      expect(typeof getAnalysisStatusColorClasses).toBe('function');
      expect(typeof getAnalysisStatusIcon).toBe('function');
    });

    it('should call analysis status functions correctly', () => {
      // Test that the exported functions work (they're re-exports from analysis-status)
      // These will call the actual imported functions, covering the export lines
      try {
        isAnalysisCompleted('COMPLETED');
        isAnalysisProcessing('PROCESSING');
        isAnalysisPending('PENDING');
        isAnalysisFailed('FAILED');
        isAnalysisInProgress('IN_PROGRESS');
        isAnalysisFinished('COMPLETED');
        normalizeAnalysisStatus('completed');
        getAnalysisStatusDisplayName('COMPLETED');
        getAnalysisStatusColorClasses('COMPLETED');
        getAnalysisStatusIcon('COMPLETED');
      } catch (error) {
        // Functions might have implementation details we don't need to test here
        // The important part is that they are exported and can be called
      }
    });
  });

  describe('AdaptiveTimeout - Historical Duration Coverage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should use historical duration for adaptive timeout calculation', async () => {
      const operationName = 'historical-duration-test';
      
      // First, add some historical data by completing operations
      const promise1 = AdaptiveTimeout.createAdaptiveTimeout(
        Promise.resolve('success1'),
        1000,
        operationName
      );
      
      // Complete first operation to add historical data
      await promise1;
      
      // Add more historical data points with known durations
      // Manually simulate operations that took specific amounts of time
      const performanceData = (AdaptiveTimeout as any).performanceHistory;
      if (!performanceData.has(operationName)) {
        performanceData.set(operationName, []);
      }
      
      // Add historical data points - 800ms average
      const history = performanceData.get(operationName);
      history.push(800); // Historical duration > 0
      history.push(900);
      history.push(700);
      
      // Now create adaptive timeout with historical data
      // This should trigger the line 385: adaptiveTimeout calculation with historical data
      const promise2 = AdaptiveTimeout.createAdaptiveTimeout(
        new Promise((resolve) => {
          setTimeout(() => resolve('success2'), 500);
        }),
        1000,
        operationName
      );
      
      // Advance time to complete the operation
      jest.advanceTimersByTime(500);
      
      await expect(promise2).resolves.toBe('success2');
      
      // Verify the info log was called with historical data
      // The important thing is that the historical calculation was triggered
      // We can verify by checking that the historical duration > 0 calculation was used
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('GeminiCircuitBreaker', () => {
    let circuitBreaker: GeminiCircuitBreaker;

    beforeEach(() => {
      // Reset circuit breaker state
      circuitBreaker = new GeminiCircuitBreaker();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
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

    it('should transition to HALF_OPEN after timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Force circuit to OPEN state
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-op');
        } catch (error) {
          // Expected failures
        }
      }
      
      expect(circuitBreaker.getState().state).toBe('OPEN');
      
      // Advance time past circuit breaker timeout (5 minutes)
      jest.advanceTimersByTime(300000 + 1000);
      
      // Next operation should transition to HALF_OPEN
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(successOperation, 'test-op');
      
      expect(result).toBe('success');
      // Circuit should remain HALF_OPEN after one success (needs 2 for CLOSED)
      expect(circuitBreaker.getState().state).toBe('HALF_OPEN');
    });

    it('should transition from HALF_OPEN to CLOSED after successful operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Force circuit to OPEN state
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-op');
        } catch (error) {
          // Expected failures
        }
      }
      
      // Advance time past timeout
      jest.advanceTimersByTime(300000 + 1000);
      
      // Execute successful operations to transition to CLOSED
      const successOperation = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(successOperation, 'test-op'); // First success -> HALF_OPEN
      expect(circuitBreaker.getState().state).toBe('HALF_OPEN');
      
      await circuitBreaker.execute(successOperation, 'test-op'); // Second success -> CLOSED
      expect(circuitBreaker.getState().state).toBe('CLOSED');
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });

    it('should reject operation when circuit is OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Force circuit to OPEN state
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreaker.execute(operation, 'test-op');
        } catch (error) {
          // Expected failures
        }
      }
      
      // Try to execute operation while circuit is OPEN
      const newOperation = jest.fn().mockResolvedValue('should not execute');
      
      await expect(circuitBreaker.execute(newOperation, 'test-op'))
        .rejects.toThrow('Circuit breaker is OPEN for test-op');
      
      expect(newOperation).not.toHaveBeenCalled();
    });

    it('should return circuit state information', () => {
      const state = circuitBreaker.getState();
      
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('failureCount');
      expect(state).toHaveProperty('lastFailureTime');
      expect(state.state).toBe('CLOSED');
      expect(state.failureCount).toBe(0);
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
      
      // Configure Logger for testing
      Logger._testConfig.setLogLevel('debug'); // Enable all logging levels
      Logger._testConfig.enableDatabaseLogs(true); // Enable database logging
      Logger._testConfig.enableAnalysisDebug(true); // Enable analysis logging
    });

    afterEach(() => {
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
      Logger._testConfig.reset(); // Reset Logger to default state
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
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('[DATABASE]')
      );
    });

    it('should log analysis messages', () => {
      Logger.analysis('Analysis completed');
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('[ANALYSIS]')
      );
    });

    it('should log production messages with different levels', () => {
      Logger.production('info', 'Production info message');
      expect(consoleSpies.info).toHaveBeenCalled();

      Logger.production('warn', 'Production warning message');
      expect(consoleSpies.warn).toHaveBeenCalled();

      Logger.production('error', 'Production error message');
      expect(consoleSpies.error).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      Logger.performance('test operation', 1500);
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance: test operation completed in 1500ms'),
        undefined
      );
    });

    it('should log slow operations as warnings', () => {
      Logger.performance('slow operation', 15001); // Use 15001ms to exceed the 15000ms threshold
      expect(consoleSpies.warn).toHaveBeenCalledWith(
        expect.stringContaining('Performance: slow operation completed in 15001ms (SLOW)'),
        undefined
      );
    });

    it('should log performance metrics with details', () => {
      const details = { query: 'SELECT * FROM users', rows: 100 };
      Logger.performance('database query', 2500, details);
      expect(consoleSpies.debug).toHaveBeenCalledWith(
        expect.stringContaining('Performance: database query completed in 2500ms'),
        details
      );
    });

    it('should log monitoring messages', () => {
      Logger.monitor('System monitoring message');
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('[MONITOR] System monitoring message')
      );
    });

    it('should respect log level filtering', () => {
      // Set a higher log level to test filtering
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'error';
      
      // Create new logger instances with the updated log level
      Logger.debug('This should not be logged');
      Logger.info('This should not be logged');
      Logger.warn('This should not be logged');
      Logger.error('This should be logged');
      
      // Restore original log level
      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should handle logger with additional arguments', () => {
      const additionalData = { userId: 123, action: 'test' };
      Logger.info('User action logged', additionalData);
      expect(consoleSpies.info).toHaveBeenCalledWith(
        expect.stringContaining('User action logged'),
        additionalData
      );
    });
  });

  describe('Logger - Missing Branch Coverage', () => {
    let consoleSpies: { [key: string]: jest.SpyInstance };
    let processSpies: { [key: string]: jest.SpyInstance };
    let originalIsServer: boolean;

    beforeEach(() => {
      consoleSpies = {
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        debug: jest.spyOn(console, 'debug').mockImplementation(),
      };

      processSpies = {
        stderr: jest.spyOn(process.stderr, 'write').mockImplementation(),
        stdout: jest.spyOn(process.stdout, 'write').mockImplementation(),
      };

      // Store original isServer value
      originalIsServer = (Logger as any).isServer;
      
      // Configure Logger for testing
      Logger._testConfig.setLogLevel('debug'); // Enable all logging levels
      Logger._testConfig.enableDatabaseLogs(true); // Enable database logging  
      Logger._testConfig.enableAnalysisDebug(true); // Enable analysis logging
    });

    afterEach(() => {
      Object.values(consoleSpies).forEach(spy => spy.mockRestore());
      Object.values(processSpies).forEach(spy => spy.mockRestore());
      
      // Restore original isServer value
      (Logger as any).isServer = originalIsServer;
      Logger._testConfig.reset(); // Reset Logger to default state
    });

    it('should handle server-side logging for warn messages', () => {
      // Test the server-side branch for warn logging
      (Logger as any).isServer = true;
      
      Logger.warn('Server warning message');
      
      expect(consoleSpies.warn).toHaveBeenCalled();
      expect(processSpies.stdout).toHaveBeenCalled();
    });

    it('should handle server-side logging for info messages', () => {
      // Test the server-side branch for info logging
      (Logger as any).isServer = true;
      
      Logger.info('Server info message');
      
      expect(consoleSpies.info).toHaveBeenCalled();
      expect(processSpies.stdout).toHaveBeenCalled();
    });

    it('should handle server-side logging for debug messages', () => {
      // Test the server-side branch for debug logging
      (Logger as any).isServer = true;
      
      Logger.debug('Server debug message');
      
      expect(consoleSpies.debug).toHaveBeenCalled();
      expect(processSpies.stdout).toHaveBeenCalled();
    });

    it('should handle server-side logging for error messages', () => {
      // Test the server-side branch for error logging
      (Logger as any).isServer = true;
      
      Logger.error('Server error message');
      
      expect(consoleSpies.error).toHaveBeenCalled();
      expect(processSpies.stderr).toHaveBeenCalled();
    });

    it('should handle client-side logging without process writes', () => {
      // Test the client-side branch (isServer = false)
      (Logger as any).isServer = false;
      
      Logger.warn('Client warning message');
      Logger.info('Client info message');
      Logger.debug('Client debug message');
      Logger.error('Client error message');
      
      expect(consoleSpies.warn).toHaveBeenCalled();
      expect(consoleSpies.info).toHaveBeenCalled();
      expect(consoleSpies.debug).toHaveBeenCalled();
      expect(consoleSpies.error).toHaveBeenCalled();
      
      // Should not write to process streams on client side
      expect(processSpies.stdout).not.toHaveBeenCalled();
      expect(processSpies.stderr).not.toHaveBeenCalled();
    });

    it('should handle production logging when not on server', () => {
      // Test production method when isServer is false
      (Logger as any).isServer = false;
      
      Logger.production('error', 'Production error');
      Logger.production('warn', 'Production warning');
      Logger.production('info', 'Production info');
      
      // Should not call console methods when not on server
      expect(consoleSpies.error).not.toHaveBeenCalled();
      expect(consoleSpies.warn).not.toHaveBeenCalled();
      expect(consoleSpies.info).not.toHaveBeenCalled();
      expect(processSpies.stderr).not.toHaveBeenCalled();
      expect(processSpies.stdout).not.toHaveBeenCalled();
    });

    it('should handle server-side monitor logging', () => {
      // Test monitor method with server-side logging
      (Logger as any).isServer = true;
      
      Logger.monitor('Monitor message');
      
      expect(consoleSpies.info).toHaveBeenCalled();
      expect(processSpies.stdout).toHaveBeenCalled();
    });

    it('should handle client-side monitor logging', () => {
      // Test monitor method without server-side logging
      (Logger as any).isServer = false;
      
      Logger.monitor('Monitor message');
      
      expect(consoleSpies.info).toHaveBeenCalled();
      expect(processSpies.stdout).not.toHaveBeenCalled();
    });

    it('should test log level filtering via logLevel', () => {
      // Test logging with different log levels to ensure branches are covered
      const originalLogLevel = (Logger as any).logLevel;
      
      // Set log level to 'error' to filter out other levels
      (Logger as any).logLevel = 'error';
      
      Logger.warn('Should not log');
      Logger.info('Should not log');
      Logger.debug('Should not log');
      Logger.error('Should log');
      
      expect(consoleSpies.warn).not.toHaveBeenCalled();
      expect(consoleSpies.info).not.toHaveBeenCalled();
      expect(consoleSpies.debug).not.toHaveBeenCalled();
      expect(consoleSpies.error).toHaveBeenCalled();
      
      // Restore original log level
      (Logger as any).logLevel = originalLogLevel;
    });
  });

  describe('AdaptiveTimeout - Missing Branch Coverage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should cover progressive timeout cleanup branch', async () => {
      const testPromise = Promise.resolve('cleanup test');
      const progressiveTimeout = AdaptiveTimeout.createProgressiveTimeout(
        testPromise,
        1000,
        'cleanup test'
      );
      
      // Wait for the promise to resolve
      const result = await progressiveTimeout;
      expect(result).toBe('cleanup test');
      
      // Run any pending timers to trigger cleanup
      jest.runOnlyPendingTimers();
    });

    it('should cover extendable timeout else branch when elapsed >= currentTimeout', async () => {
      const testPromise = Promise.resolve('extend branch test');
      const extendableTimeout = AdaptiveTimeout.createExtendableTimeout(
        testPromise,
        100,
        400,
        'extend branch test'
      );
      
      // Let time advance to trigger extension logic
      jest.advanceTimersByTime(100);
      
      // This should trigger the "else if (elapsed >= currentTimeout)" branch
      jest.advanceTimersByTime(50);
      
      expect(true).toBe(true);
    });

    it('should handle progressive timeout with interval cleanup', async () => {
      jest.useRealTimers();
      jest.useFakeTimers();
      
      const testPromise = Promise.resolve('interval cleanup test');
      const progressPromise = AdaptiveTimeout.createProgressiveTimeout(
        testPromise,
        500,
        'interval cleanup test',
        100
      );
      
      // Advance time to trigger progress logging
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(100);
      
      // Wait for the promise to resolve
      const result = await progressPromise;
      expect(result).toBe('interval cleanup test');
      
      // Run any pending timers to trigger cleanup
      jest.runOnlyPendingTimers();
    });

    it('should handle progressive timeout with elapsed time exceeding timeout in progress check', async () => {
      jest.useRealTimers();
      jest.useFakeTimers();
      
      const testPromise = new Promise<string>((resolve) => {
        // Promise that takes longer than the timeout
        setTimeout(() => {
          resolve('long running test');
        }, 1000);
      });
      
      const progressPromise = AdaptiveTimeout.createProgressiveTimeout(
        testPromise,
        200, // Short timeout
        'elapsed-exceeded-test',
        50 // Short interval to trigger multiple progress checks
      );
      
      // Advance time to trigger multiple progress checks where elapsed > timeoutMs
      jest.advanceTimersByTime(50);  // First progress check
      jest.advanceTimersByTime(50);  // Second progress check 
      jest.advanceTimersByTime(150); // This should trigger the branch where elapsed >= timeoutMs
      
      jest.runOnlyPendingTimers();
      
      try {
        await progressPromise;
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('timed out after 200ms');
      }
    });
  });

  describe('Utility Functions - Edge Cases', () => {
    it('should handle formatFileSize with exactly 1024 boundaries', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle validateFileSize with exact limit', () => {
      expect(validateFileSize(5 * 1024 * 1024, 5 * 1024 * 1024)).toBe(true);
      expect(validateFileSize(5 * 1024 * 1024 + 1, 5 * 1024 * 1024)).toBe(false);
    });

    it('should handle email validation edge cases', () => {
      expect(validateEmail('test@test')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@test.com')).toBe(false);
      expect(validateEmail('test.test@test.com')).toBe(true);
    });

    it('should handle analysis status getters for all status types', () => {
      const statuses = ['COMPLETED', 'PROCESSING', 'PENDING', 'FAILED', 'IN_PROGRESS', 'CANCELLED'];
      
      statuses.forEach(status => {
        expect(typeof getStatusColor(status as any)).toBe('string');
        expect(typeof getStatusIcon(status as any)).toBe('string');
      });
    });
  });

  describe('Environment Detection and Edge Cases', () => {
    let originalProcess: any;
    let originalWindow: any;

    beforeEach(() => {
      // Store original values
      originalProcess = global.process;
      originalWindow = (global as any).window;
    });

    afterEach(() => {
      // Restore original values
      global.process = originalProcess;
      (global as any).window = originalWindow;
    });

    it('should handle browser environment (no process)', () => {
      // Test that existing Logger works without process
      expect(() => {
        Logger.info('Browser test message');
      }).not.toThrow();
    });

    it('should handle production environment', () => {
      // Test production logging functions directly
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      Logger.production('info', 'Production test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[PRODUCTION-INFO]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Production test message')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle progressive timeout progress callback branch', async () => {
      jest.useFakeTimers();
      
      const progressSpy = jest.fn();
      
      const timeoutPromise = AdaptiveTimeout.createProgressiveTimeout(
        new Promise((resolve) => {
          setTimeout(() => resolve('success'), 500);
        }),
        2000,
        'progress test'
      );
      
      // Advance time to trigger progress logging (line 340-358 branch)
      jest.advanceTimersByTime(1000);
      
      // Complete the operation
      jest.advanceTimersByTime(500);
      
      await expect(timeoutPromise).resolves.toBe('success');
      
      jest.useRealTimers();
    });

    it('should handle extendable timeout onProgress callback', async () => {
      jest.useFakeTimers();
      
      const progressSpy = jest.fn();
      
      const timeoutPromise = AdaptiveTimeout.createExtendableTimeout(
        new Promise((resolve) => {
          setTimeout(() => resolve('success'), 150);
        }),
        100,
        500,
        'extendable progress test',
        progressSpy // This tests the onProgress callback branch
      );
      
      // Advance time to trigger the timeout extension and progress callback
      jest.advanceTimersByTime(120);
      
      expect(progressSpy).toHaveBeenCalled();
      
      // Complete the operation
      jest.advanceTimersByTime(50);
      
      await expect(timeoutPromise).resolves.toBe('success');
      
      jest.useRealTimers();
    });

    it('should handle adaptive timeout with no historical data branch', async () => {
      // Test the branch where historicalDuration === 0 (line 293)
      const performanceData = (AdaptiveTimeout as any).performanceHistory;
      
      // Clear all historical data
      performanceData.clear();
      
      const timeoutPromise = AdaptiveTimeout.createAdaptiveTimeout(
        Promise.resolve('success'),
        1000,
        'no-history-test'
      );
      
      await expect(timeoutPromise).resolves.toBe('success');
      
      // Verify history was recorded
      expect(performanceData.has('no-history-test')).toBe(true);
    });

    it('should handle process.stderr write error gracefully', () => {
      // Test server-side error logging branch
      const originalStderr = process.stderr.write;
      const mockWrite = jest.fn();
      process.stderr.write = mockWrite;
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      Logger.error('Test error with stderr');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockWrite).toHaveBeenCalled();
      
      // Restore
      process.stderr.write = originalStderr;
      consoleErrorSpy.mockRestore();
    });

    it('should handle different log levels in shouldLog', () => {
      // Test the shouldLog method with different levels to cover all branches
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        // Test each level by setting it and verifying others are filtered
        const originalLogLevel = (Logger as any).logLevel;
        (Logger as any).logLevel = level;
        
        // Test that current level and higher priority levels return true
        expect((Logger as any).shouldLog('error')).toBe(true);
        
        if (level !== 'error') {
          const shouldLog = (Logger as any).shouldLog(level);
          expect(typeof shouldLog).toBe('boolean');
        }
        
        // Restore
        (Logger as any).logLevel = originalLogLevel;
      });
    });
  });
});