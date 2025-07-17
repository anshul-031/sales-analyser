import { 
  cn, 
  formatDate, 
  validateEmail, 
  validateFileSize, 
  getStatusColor, 
  getStatusIcon,
  Logger,
  AppError,
  handleApiError
} from '../utils';

describe('utils additional functions', () => {
  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2');
      expect(typeof result).toBe('string');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', { 'conditional': true, 'hidden': false });
      expect(result).toContain('base');
      expect(result).toContain('conditional');
      expect(result).not.toContain('hidden');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      const formatted = formatDate(date);
      
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/2024/); // Should contain the year
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('test+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should return true for valid file sizes', () => {
      expect(validateFileSize(1000, 2000)).toBe(true);
      expect(validateFileSize(0, 1000)).toBe(true);
    });

    it('should return false for oversized files', () => {
      expect(validateFileSize(3000, 2000)).toBe(false);
    });

    it('should use default max size when not provided', () => {
      expect(validateFileSize(1000)).toBe(true);
    });
  });

  describe('getStatusColor', () => {
    it('should return appropriate colors for different statuses', () => {
      expect(getStatusColor('COMPLETED')).toContain('green');
      expect(getStatusColor('FAILED')).toContain('red');
      expect(getStatusColor('PENDING')).toContain('yellow');
      expect(getStatusColor('PROCESSING')).toContain('blue');
    });

    it('should return default color for unknown status', () => {
      const color = getStatusColor('UNKNOWN');
      expect(typeof color).toBe('string');
    });
  });

  describe('getStatusIcon', () => {
    it('should return appropriate icons for different statuses', () => {
      const completedIcon = getStatusIcon('COMPLETED');
      const failedIcon = getStatusIcon('FAILED');
      const pendingIcon = getStatusIcon('PENDING');
      
      expect(typeof completedIcon).toBe('string');
      expect(typeof failedIcon).toBe('string');
      expect(typeof pendingIcon).toBe('string');
    });
  });

  describe('Logger static methods', () => {
    it('should have static logging methods', () => {
      expect(typeof Logger.error).toBe('function');
      expect(typeof Logger.warn).toBe('function');
      expect(typeof Logger.info).toBe('function');
      expect(typeof Logger.debug).toBe('function');
    });

    it('should log messages without throwing', () => {
      expect(() => Logger.info('test message')).not.toThrow();
      expect(() => Logger.error('test error')).not.toThrow();
      expect(() => Logger.warn('test warning')).not.toThrow();
      expect(() => Logger.debug('test debug')).not.toThrow();
    });
  });

  describe('AppError', () => {
    it('should create custom error with status code', () => {
      const error = new AppError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error instanceof Error).toBe(true);
    });

    it('should default to 500 status code', () => {
      const error = new AppError('Test error');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('handleApiError', () => {
    it('should handle AppError instances', () => {
      const appError = new AppError('Custom error', 400);
      const result = handleApiError(appError);
      
      expect(result.message).toBe('Custom error');
      expect(result.statusCode).toBe(400);
    });

    it('should handle regular Error instances', () => {
      const error = new Error('Regular error');
      const result = handleApiError(error);
      
      expect(result.message).toBe('Regular error');
      expect(result.statusCode).toBe(500);
    });

    it('should handle unknown error types', () => {
      const result = handleApiError('string error');
      
      expect(result.message).toBe('Internal server error');
      expect(result.statusCode).toBe(500);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      
      expect(() => formatDate(null as any)).not.toThrow();
      expect(() => formatDate(undefined as any)).not.toThrow();
    });

    it('should handle empty strings in status functions', () => {
      expect(() => getStatusColor('')).not.toThrow();
      expect(() => getStatusIcon('')).not.toThrow();
    });
  });
});
