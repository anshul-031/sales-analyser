import { LoggingConfig, ProductionMonitoring, ErrorCategories } from '../logging-config';

describe('LoggingConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should have correct default values', () => {
    expect(LoggingConfig.logLevel).toBe('debug');
    expect(LoggingConfig.timeouts.transcription).toBe(1800000);
    expect(LoggingConfig.timeouts.analysis).toBe(2700000);
  });

  it('should be overridden by environment variables', () => {
    process.env.LOG_LEVEL = 'info';
    process.env.TRANSCRIPTION_TIMEOUT_MS = '1000';
    process.env.ANALYSIS_TIMEOUT_MS = '2000';

    const { LoggingConfig: updatedConfig } = require('../logging-config');

    expect(updatedConfig.logLevel).toBe('info');
    expect(updatedConfig.timeouts.transcription).toBe(1000);
    expect(updatedConfig.timeouts.analysis).toBe(2000);
  });
});

describe('ProductionMonitoring', () => {
  const originalLog = console.log;
  const originalError = console.error;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it('logOperationMetrics should log correct data', () => {
    ProductionMonitoring.logOperationMetrics('test-op', 100, true, { custom: 'data' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"OPERATION_METRIC"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"operation":"test-op"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"duration":100'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"success":true'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"custom":"data"'));
  });

  it('logSystemResources should log correct data', () => {
    ProductionMonitoring.logSystemResources();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"SYSTEM_HEALTH"'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"rss"'));
  });

  it('logCategorizedError should log correct data', () => {
    const error = new Error('Test error');
    ProductionMonitoring.logCategorizedError(ErrorCategories.UNKNOWN, error, { context: 'test' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"CATEGORIZED_ERROR"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"category":"UNKNOWN"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"Test error"'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"context":"test"'));
  });

  it('should log startup message', () => {
    // Re-require the module to execute the startup logic
    jest.isolateModules(() => {
      require('../logging-config');
    });
    
    // Check for startup log
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"type":"STARTUP"'));
  });
});