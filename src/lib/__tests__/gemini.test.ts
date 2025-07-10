import { geminiService, GeminiAnalysisService, DEFAULT_ANALYSIS_PARAMETERS } from '../gemini';

// Mock the logger and circuit breaker utilities
jest.mock('../utils', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    analysis: jest.fn(),
    performance: jest.fn(),
    production: jest.fn(),
  },
  GeminiCircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation((fn) => fn()),
  })),
}));

// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: Promise.resolve({
          text: jest.fn().mockReturnValue('{"score": 85, "summary": "Good call", "strengths": ["clear communication"], "improvements": ["follow up"], "specific_examples": ["example1"], "recommendations": ["rec1"]}'),
        }),
      }),
    }),
  })),
}));

// Mock environment variables
const originalEnv = process.env;

describe('Gemini Service Exports', () => {
  it('should export geminiService instance', () => {
    expect(geminiService).toBeDefined();
    expect(geminiService).toBeInstanceOf(GeminiAnalysisService);
  });

  it('should export DEFAULT_ANALYSIS_PARAMETERS', () => {
    expect(DEFAULT_ANALYSIS_PARAMETERS).toBeDefined();
    expect(typeof DEFAULT_ANALYSIS_PARAMETERS).toBe('object');
  });

  it('should export GeminiAnalysisService class', () => {
    expect(GeminiAnalysisService).toBeDefined();
    expect(typeof GeminiAnalysisService).toBe('function');
  });
});

describe('GeminiAnalysisService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.GOOGLE_GEMINI_API_KEYS = '["test-key-1", "test-key-2"]';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create an instance', () => {
    const service = new GeminiAnalysisService();
    expect(service).toBeDefined();
  });

  it('should have required methods', () => {
    const service = new GeminiAnalysisService();
    expect(typeof service.transcribeAudio).toBe('function');
    expect(typeof service.analyzeWithCustomParameters).toBe('function');
    expect(typeof service.analyzeWithDefaultParameters).toBe('function');
    expect(typeof service.analyzeWithCustomPrompt).toBe('function');
    expect(typeof service.generateChatbotResponse).toBe('function');
  });

  it('should handle basic method structure', () => {
    const service = new GeminiAnalysisService();
    expect(service).toBeInstanceOf(GeminiAnalysisService);
  });

  it('should have working geminiService instance', () => {
    expect(typeof geminiService.transcribeAudio).toBe('function');
    expect(typeof geminiService.analyzeWithCustomParameters).toBe('function');
    expect(typeof geminiService.analyzeWithDefaultParameters).toBe('function');
    expect(typeof geminiService.analyzeWithCustomPrompt).toBe('function');
    expect(typeof geminiService.generateChatbotResponse).toBe('function');
  });
});

describe('GeminiAnalysisService Methods', () => {
  it('should have all required methods', () => {
    const service = new GeminiAnalysisService();
    expect(typeof service.transcribeAudio).toBe('function');
    expect(typeof service.analyzeWithCustomParameters).toBe('function');
    expect(typeof service.analyzeWithDefaultParameters).toBe('function');
    expect(typeof service.analyzeWithCustomPrompt).toBe('function');
    expect(typeof service.generateChatbotResponse).toBe('function');
  });

  it('should handle missing audio buffer gracefully', async () => {
    const service = new GeminiAnalysisService();
    
    await expect(service.transcribeAudio(null as any, 'audio/mpeg'))
      .rejects.toThrow();
  });

  it('should handle invalid parameters gracefully', async () => {
    const service = new GeminiAnalysisService();
    
    const result = await service.analyzeWithCustomParameters('', []);
    expect(result).toBeDefined();
    expect(result.type).toBe('parameters');
  });

  it('should handle empty transcription gracefully', async () => {
    const service = new GeminiAnalysisService();
    
    const result = await service.analyzeWithDefaultParameters('');
    expect(result).toBeDefined();
    expect(result.type).toBe('default');
  });

  it('should get model name from environment variable', () => {
    process.env.GEMINI_MODEL = 'gemini-1.5-pro';
    const service = new GeminiAnalysisService();
    
    // Access private method for testing
    const modelName = (service as any).getModelName();
    expect(modelName).toBe('gemini-1.5-pro');
  });

  it('should use default model when no environment variable set', () => {
    delete process.env.GEMINI_MODEL;
    const service = new GeminiAnalysisService();
    
    // Access private method for testing
    const modelName = (service as any).getModelName();
    expect(modelName).toBe('gemini-2.5-flash-lite-preview-06-17');
  });
});

describe('GeminiAPIKeyManager', () => {
  it('should handle environment variables correctly', () => {
    process.env.GOOGLE_GEMINI_API_KEYS = '["key1", "key2", "key3"]';
    const service = new GeminiAnalysisService();
    expect(service).toBeDefined();
  });

  it('should handle malformed API keys', () => {
    process.env.GOOGLE_GEMINI_API_KEYS = 'invalid json';
    const service = new GeminiAnalysisService();
    expect(service).toBeDefined();
  });

  it('should handle missing API keys environment variable', () => {
    delete process.env.GOOGLE_GEMINI_API_KEYS;
    const service = new GeminiAnalysisService();
    expect(service).toBeDefined();
  });
});
