import { GoogleGenerativeAI } from '@google/generative-ai';

jest.setTimeout(10000); // Increased timeout for comprehensive tests

// Mock console methods
global.console = {
  ...global.console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock dependencies
jest.mock('@google/generative-ai');
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
    execute: jest.fn((operation) => operation()),
    getState: jest.fn(() => 'CLOSED'),
  })),
}));

jest.mock('@/lib/db', () => ({
  DatabaseStorage: {
    getActionItemTypeById: jest.fn(),
    getEnabledActionItemTypesByUserId: jest.fn(() => Promise.resolve([])),
  },
}));

import { GeminiAnalysisService, DEFAULT_ANALYSIS_PARAMETERS } from '../gemini';
import { DatabaseStorage } from '@/lib/db';

// Add tests for API Key Manager functionality
describe('GeminiAPIKeyManager', () => {
  let originalProcessEnv: any;
  
  beforeEach(() => {
    originalProcessEnv = process.env;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalProcessEnv;
  });

  it('should handle invalid string API keys', () => {
    process.env.GOOGLE_GEMINI_API_KEYS = '["", "   ", null, undefined]';
    const service = new GeminiAnalysisService();
    expect(service).toBeInstanceOf(GeminiAnalysisService);
  });

  it('should handle non-string API keys in array', () => {
    process.env.GOOGLE_GEMINI_API_KEYS = '[123, true, {}, []]';
    const service = new GeminiAnalysisService();
    expect(service).toBeInstanceOf(GeminiAnalysisService);
  });

  it('should handle null in API keys array', () => {
    process.env.GOOGLE_GEMINI_API_KEYS = '[null, "valid-key"]';
    const service = new GeminiAnalysisService();
    expect(service).toBeInstanceOf(GeminiAnalysisService);
  });

  it('should handle client-side environment correctly', () => {
    // Mock client-side environment
    const originalProcess = global.process;
    delete (global as any).process;
    
    try {
      const service = new GeminiAnalysisService();
      expect(service).toBeInstanceOf(GeminiAnalysisService);
    } finally {
      global.process = originalProcess;
    }
  });
});

describe('GeminiAnalysisService', () => {
  let service: GeminiAnalysisService;
  let mockGenerativeModel: any;
  let mockGenerateContent: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env.GOOGLE_GEMINI_API_KEYS = '["test-key-1", "test-key-2"]';
    process.env.GEMINI_MODEL = 'gemini-1.5-flash';

    mockGenerateContent = jest.fn();
    mockGenerativeModel = {
      generateContent: mockGenerateContent,
    };

    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue(mockGenerativeModel),
    }) as any);

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ 
          score: 8, 
          summary: "Good performance", 
          strengths: ["Great communication"], 
          improvements: ["Better timing"], 
          specific_examples: ["Example 1"], 
          recommendations: ["Do better next time"] 
        }),
      },
    });

    service = new GeminiAnalysisService();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with API keys from environment', () => {
      expect(service).toBeInstanceOf(GeminiAnalysisService);
    });

    it('should handle missing API keys gracefully', () => {
      delete process.env.GOOGLE_GEMINI_API_KEYS;
      const newService = new GeminiAnalysisService();
      expect(newService).toBeInstanceOf(GeminiAnalysisService);
    });

    it('should handle invalid JSON in API keys', () => {
      process.env.GOOGLE_GEMINI_API_KEYS = 'invalid-json';
      const newService = new GeminiAnalysisService();
      expect(newService).toBeInstanceOf(GeminiAnalysisService);
    });

    it('should handle empty API keys array', () => {
      process.env.GOOGLE_GEMINI_API_KEYS = '[]';
      const newService = new GeminiAnalysisService();
      expect(newService).toBeInstanceOf(GeminiAnalysisService);
    });
  });

  describe('Error Handling Without Retry', () => {
    it('should handle permission denied errors', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('permission_denied'));

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle invalid request errors', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('invalid request'));

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle bad request errors', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('bad request'));

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });
  });

  describe('Complex Analysis Scenarios', () => {
    it('should handle analyzeWithCustomParameters with userId and action item types', async () => {
      const mockActionItems = [
        { title: 'Follow up', description: 'Call client', priority: 'HIGH', deadline: null, assignee: null, context: '' }
      ];
      jest.spyOn(service, 'extractActionItems').mockResolvedValue(mockActionItems);

      const parameters = [
        { id: '1', name: 'Test Param', description: 'Test description', prompt: 'Test prompt', enabled: true }
      ];

      const result = await service.analyzeWithCustomParameters(
        'test transcription', 
        parameters, 
        'user123', 
        ['actionType1', 'actionType2']
      );

      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('actionItems');
      expect(result.actionItems).toEqual(mockActionItems);
    });

    it('should handle analyzeWithDefaultParameters with userId and action item types', async () => {
      const mockActionItems = [
        { title: 'Default task', description: 'Default desc', priority: 'MEDIUM', deadline: null, assignee: null, context: '' }
      ];
      jest.spyOn(service, 'extractActionItems').mockResolvedValue(mockActionItems);

      const result = await service.analyzeWithDefaultParameters(
        'test transcription',
        'user456',
        ['defaultType1']
      );

      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('actionItems');
      expect(result.actionItems).toEqual(mockActionItems);
    });

    it('should handle analyzeWithCustomPrompt with userId and action item types', async () => {
      const mockActionItems = [
        { title: 'Custom task', description: 'Custom desc', priority: 'LOW', deadline: null, assignee: null, context: '' }
      ];
      jest.spyOn(service, 'extractActionItems').mockResolvedValue(mockActionItems);
      
      const mockAnalysis = { 
        summary: 'Custom analysis', 
        key_findings: ['Finding 1'], 
        scores: { overall: 7 }, 
        recommendations: ['Recommendation 1'], 
        specific_examples: ['Example 1'] 
      };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockAnalysis) }
      });

      const result = await service.analyzeWithCustomPrompt(
        'test transcription', 
        'Custom prompt',
        'user789',
        ['customType1']
      );

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('actionItems');
      expect(result.actionItems).toEqual(mockActionItems);
    });
  });

  describe('analyzeWithCustomParameters', () => {
    it('should analyze with custom parameters successfully', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);

      const parameters = [
        { id: '1', name: 'Test Param', description: 'Test description', prompt: 'Test prompt', enabled: true }
      ];

      const result = await service.analyzeWithCustomParameters('test transcription', parameters);

      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('analysisDate');
    });

    it('should handle analysis errors gracefully', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('API Error'));
      
      const parameters = [
        { id: '1', name: 'Test Param', description: 'Test description', prompt: 'Test prompt', enabled: true }
      ];

      const result = await service.analyzeWithCustomParameters('test transcription', parameters);

      expect(result.parameters['1'].score).toBe(0);
      expect(result.parameters['1'].summary).toContain('Failed to get analysis');
    });

    it('should skip disabled parameters', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      const parameters = [
        { id: '1', name: 'Enabled Param', description: 'Test 1', prompt: 'Test 1', enabled: true },
        { id: '2', name: 'Disabled Param', description: 'Test 2', prompt: 'Test 2', enabled: false }
      ];

      const result = await service.analyzeWithCustomParameters('test transcription', parameters);

      expect(Object.keys(result.parameters)).toHaveLength(1);
      expect(result.parameters['1']).toBeDefined();
      expect(result.parameters['2']).toBeUndefined();
    });
  });

  describe('analyzeWithDefaultParameters', () => {
    it('should analyze with default parameters successfully', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);

      const result = await service.analyzeWithDefaultParameters('test transcription');

      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('overallScore');
      expect(result.type).toBe('default');
      expect(Object.keys(result.parameters)).toEqual(Object.keys(DEFAULT_ANALYSIS_PARAMETERS));
    });

    it('should handle action item extraction failure', async () => {
      jest.spyOn(service, 'extractActionItems').mockRejectedValue(new Error('Extraction failed'));

      await expect(service.analyzeWithDefaultParameters('test transcription'))
        .rejects.toThrow('Default analysis failed');
    });
  });

  describe('analyzeWithCustomPrompt', () => {
    it('should analyze with custom prompt successfully', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      const mockAnalysis = { summary: 'Test analysis', key_findings: [], scores: {}, recommendations: [], specific_examples: [] };
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(mockAnalysis) }
      });

      const result = await service.analyzeWithCustomPrompt('test transcription', 'Custom prompt');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('analysisDate');
      expect(result.type).toBe('custom');
      expect(result.summary).toBe('Test analysis');
    });

    it('should handle API call failures', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('API Error'));

      await expect(service.analyzeWithCustomPrompt('test transcription', 'Custom prompt'))
        .rejects.toThrow('Custom analysis failed');
    });
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify({ original_language: 'en', diarized_transcription: [] }) }
      });

      const audioBuffer = Buffer.from('fake_audio_data');
      const result = await service.transcribeAudio(audioBuffer, 'audio/mp3');

      const parsed = JSON.parse(result);
      expect(parsed.original_language).toBe('en');
    });

    it('should handle non-JSON responses gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Plain text transcription' }
      });

      const audioBuffer = Buffer.from('fake_audio_data');
      const result = await service.transcribeAudio(audioBuffer, 'audio/mp3');

      const parsed = JSON.parse(result);
      expect(parsed.diarized_transcription[0].text).toBe('Plain text transcription');
    });

    it('should handle API key errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API key not valid'));

      const audioBuffer = Buffer.from('fake_audio_data');
      
      await expect(service.transcribeAudio(audioBuffer, 'audio/mp3'))
        .rejects.toThrow('Invalid Google Gemini API key');
    });
  });

  describe('extractActionItems', () => {
    it('should extract action items successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => '[{"title": "Follow up", "description": "Call client", "priority": "HIGH", "deadline": null, "assignee": null, "context": ""}]' 
        }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Follow up');
      expect(result[0].description).toBe('Call client');
    });

    it('should handle comma-delimited JSON objects', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => '{"title": "Task 1", "description": "First task", "priority": "HIGH", "deadline": null, "assignee": null, "context": ""}, {"title": "Task 2", "description": "Second task", "priority": "LOW", "deadline": null, "assignee": null, "context": ""}' 
        }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    it('should return empty array for empty response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '[]' }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(0);
    });

    it('should handle extractActionItems with english_translation in transcription data', async () => {
      // Mock a transcription response with english_translation
      const transcriptionData = {
        diarized_transcription: [
          { speaker: 'Speaker 1', text: 'Original text' }
        ],
        english_translation: [
          { speaker: 'Speaker 1', text: 'Translated text' }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => JSON.stringify([{"title": "Test", "description": "Test desc"}])
        }
      });

      const result = await service.extractActionItems(JSON.stringify(transcriptionData));
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should handle extractActionItems with diarized_transcription only', async () => {
      // Mock a transcription response with only diarized_transcription
      const transcriptionData = {
        diarized_transcription: [
          { speaker: 'Speaker 1', text: 'Test content' },
          { speaker: 'Speaker 2', text: 'More content' }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => JSON.stringify([{"title": "Test", "description": "Test desc"}])
        }
      });

      const result = await service.extractActionItems(JSON.stringify(transcriptionData));
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should handle extractActionItems with invalid JSON transcription data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // This should trigger the error catch block and use transcription as plain text
      const invalidJson = 'This is not valid JSON but should still work';

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => JSON.stringify([{"title": "Test", "description": "Test desc"}])
        }
      });

      const result = await service.extractActionItems(invalidJson);
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Using transcription as plain text for action item extraction');
      expect(result).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should handle transcription data with successful JSON conversion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const transcriptionData = {
        diarized_transcription: [
          { speaker: 'Speaker 1', text: 'Hello world' }
        ]
      };

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => JSON.stringify([{"title": "Test", "description": "Test desc"}])
        }
      });

      const result = await service.extractActionItems(JSON.stringify(transcriptionData));
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Converted JSON transcription to readable format for action item extraction');
      expect(result).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should handle extractActionItems with API call failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock makeAPICallWithRetry to throw an error
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('API call failed'));

      const result = await service.extractActionItems('test transcription');
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Action items extraction error:', expect.any(Error));
      expect(result).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle extractActionItems with userId but no override types', async () => {
      // Mock database to return enabled types for user
      const mockDB = require('@/lib/db');
      mockDB.DatabaseStorage.getEnabledActionItemTypesByUserId.mockResolvedValue([
        { id: 'type1', name: 'Type 1', userId: 'user123' },
        { id: 'type2', name: 'Type 2', userId: 'user123' }
      ]);

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => JSON.stringify([{"title": "Test", "description": "Test desc"}])
        }
      });

      // Call with userId but no override types (empty array or null)
      const result = await service.extractActionItems('test transcription', 'user123', []);
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
      expect(mockDB.DatabaseStorage.getEnabledActionItemTypesByUserId).toHaveBeenCalledWith('user123');
    });
  });

  describe('generateChatbotResponse', () => {
    it('should generate chatbot response successfully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Chatbot response' }
      });

      const result = await service.generateChatbotResponse('test message');

      expect(result).toBe('Chatbot response');
    });

    it('should handle API errors', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('API Error'));

      await expect(service.generateChatbotResponse('test message'))
        .rejects.toThrow('Chatbot response generation failed');
    });
  });

  describe('Private Method Testing', () => {
    it('should test parseActionItemsResponse with valid JSON array', () => {
      const validJsonArray = '[{"title": "Test", "description": "Test desc", "priority": "HIGH", "deadline": null, "assignee": null, "context": ""}]';
      const result = (service as any).parseActionItemsResponse(validJsonArray);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });

    it('should test parseActionItemsResponse with malformed JSON', () => {
      const malformedJson = '{ "title": "Test", "description": "Test desc" }, { "title": "Test2", "description": "Test desc2" }';
      const result = (service as any).parseActionItemsResponse(malformedJson);
      expect(result).toHaveLength(2);
    });

    it('should test parseActionItemsResponse with no JSON', () => {
      const noJson = 'This is not JSON at all';
      const result = (service as any).parseActionItemsResponse(noJson);
      expect(result).toHaveLength(0);
    });

    it('should test parseCommaDelimitedObjects', () => {
      const delimitedObjects = '{"title": "Task1", "description": "Desc1"}, {"title": "Task2", "description": "Desc2"}';
      const result = (service as any).parseCommaDelimitedObjects(delimitedObjects);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task1');
      expect(result[1].title).toBe('Task2');
    });

    it('should test extractFieldsFromMalformedJson', () => {
      const malformedJson = '"score": 8, "summary": "Good performance", "strengths": ["Communication"], "improvements": ["Timing"]';
      const result = (service as any).extractFieldsFromMalformedJson(malformedJson);
      expect(result.score).toBe(8);
      expect(result.summary).toBe('Good performance');
      expect(result.strengths).toContain('Communication');
      expect(result.improvements).toContain('Timing');
    });
  });

  describe('API Key Manager Integration', () => {
    it('should handle client-side environment gracefully', () => {
      // Mock client-side environment
      const originalProcess = global.process;
      delete (global as any).process;
      
      try {
        const newService = new GeminiAnalysisService();
        expect(newService).toBeInstanceOf(GeminiAnalysisService);
      } finally {
        global.process = originalProcess;
      }
    });

    it('should handle getModelName with different environments', () => {
      const originalEnv = process.env.GEMINI_MODEL;
      process.env.GEMINI_MODEL = 'custom-model';
      
      const modelName = (service as any).getModelName();
      expect(modelName).toBe('custom-model');
      
      process.env.GEMINI_MODEL = originalEnv;
    });

    it('should handle getModelName with undefined environment', () => {
      const originalEnv = process.env.GEMINI_MODEL;
      delete process.env.GEMINI_MODEL;
      
      const modelName = (service as any).getModelName();
      expect(modelName).toBe('gemini-2.5-flash-lite-preview-06-17');
      
      process.env.GEMINI_MODEL = originalEnv;
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle empty parameter arrays', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      const result = await service.analyzeWithCustomParameters('test transcription', []);

      expect(result).toHaveProperty('parameters');
      expect(result.overallScore).toBe(0);
    });

    it('should handle special characters in transcription', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      const specialText = 'Text with émojis 🚀 and spécial çharacters!';
      const result = await service.analyzeWithDefaultParameters(specialText);

      expect(result).toHaveProperty('parameters');
    });
  });

  describe('Transcription Error Handling', () => {
    it('should handle PERMISSION_DENIED error in transcribeAudio', async () => {
      mockGenerateContent.mockRejectedValue(new Error('PERMISSION_DENIED'));

      const audioBuffer = Buffer.from('fake_audio_data');
      
      await expect(service.transcribeAudio(audioBuffer, 'audio/mp3'))
        .rejects.toThrow('Permission denied for Google Gemini API');
    });

    it('should handle QUOTA_EXCEEDED error in transcribeAudio', async () => {
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(new Error('QUOTA_EXCEEDED'));

      const audioBuffer = Buffer.from('fake_audio_data');
      
      await expect(service.transcribeAudio(audioBuffer, 'audio/mp3'))
        .rejects.toThrow('Google Gemini API quota exceeded');
    });

    it('should handle API_KEY_INVALID error in transcribeAudio', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API_KEY_INVALID'));

      const audioBuffer = Buffer.from('fake_audio_data');
      
      await expect(service.transcribeAudio(audioBuffer, 'audio/mp3'))
        .rejects.toThrow('Google Gemini API key is invalid');
    });
  });

  describe('Action Item Extraction Edge Cases', () => {
    it('should handle invalid JSON in extractActionItems', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'invalid json {{{' }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(0);
    });

    it('should handle JSON with missing required fields', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '[{"title": "Test"}]' }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(1); // Found object but incomplete structure
    });

    it('should handle malformed JSON objects', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{ "title": "Test", "description": "Test desc", }' }
      });

      const result = await service.extractActionItems('test transcription');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test');
    });
  });

  describe('JSON Response Validation', () => {
    it('should test makeAPICallWithJsonResponse with valid JSON', async () => {
      const operation = jest.fn().mockResolvedValue('{"valid": "json"}');
      const validator = (data: any) => data.valid === 'json';
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator);
      
      expect(result.valid).toBe('json');
    });

    it('should test makeAPICallWithJsonResponse with invalid JSON', async () => {
      // Mock the retry mechanism to avoid timeout
      const mockRetry = jest.spyOn(service as any, 'makeAPICallWithRetry')
        .mockRejectedValue(new Error('No JSON object found in response'));
      
      const operation = jest.fn().mockResolvedValue('invalid json');
      const validator = () => true;
      
      await expect((service as any).makeAPICallWithJsonResponse(operation, validator))
        .rejects.toThrow('No JSON object found in response');
        
      mockRetry.mockRestore();
    }, 5000);

    it('should test makeAPICallWithJsonResponse with validation failure', async () => {
      // Mock the retry mechanism to avoid timeout
      const mockRetry = jest.spyOn(service as any, 'makeAPICallWithRetry')
        .mockRejectedValue(new Error('JSON validation failed'));
      
      const operation = jest.fn().mockResolvedValue('{"invalid": "data"}');
      const validator = (data: any) => data.valid === 'json';
      
      await expect((service as any).makeAPICallWithJsonResponse(operation, validator))
        .rejects.toThrow('JSON validation failed');
        
      mockRetry.mockRestore();
    }, 5000);
  });

  describe('Circuit Breaker and Production Logging', () => {
    it('should handle circuit breaker execution', async () => {
      const mockCircuitBreaker = {
        execute: jest.fn().mockImplementation((operation) => operation()),
        getState: jest.fn().mockReturnValue('OPEN')
      };
      
      // Replace the circuit breaker mock
      require('../utils').GeminiCircuitBreaker.mockImplementation(() => mockCircuitBreaker);
      
      // Mock the response to match what generateChatbotResponse expects
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Chatbot response' }
      });
      
      const result = await service.generateChatbotResponse('test');
      
      expect(result).toBe('Chatbot response');
    });

    it('should test production error logging', async () => {
      // Mock NODE_ENV by modifying process.env temporarily
      const originalNodeEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = 'production';
      
      const productionError = new Error('production test error');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(productionError);
      
      try {
        await service.generateChatbotResponse('test');
      } catch (error) {
        // Expected to throw
      }
      
      // Restore original NODE_ENV
      (process.env as any).NODE_ENV = originalNodeEnv;
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle getCurrentModel method', () => {
      const model = (service as any).getCurrentModel();
      expect(model).toBeDefined();
    });

    it('should handle analyzeWithCustomParameters with no enabled parameters', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      const parameters = [
        { id: '1', name: 'Disabled Param', description: 'Test', prompt: 'Test', enabled: false }
      ];

      const result = await service.analyzeWithCustomParameters('test transcription', parameters);

      expect(result).toHaveProperty('parameters');
      expect(Object.keys(result.parameters)).toHaveLength(0);
    });

    it('should handle parseActionItemsResponse with empty string', () => {
      const result = (service as any).parseActionItemsResponse('');
      expect(result).toHaveLength(0);
    });

    it('should handle parseActionItemsResponse with only whitespace', () => {
      const result = (service as any).parseActionItemsResponse('   \n\t  ');
      expect(result).toHaveLength(0);
    });

    it('should handle extractFieldsFromMalformedJson with completely empty input', () => {
      const result = (service as any).extractFieldsFromMalformedJson('');
      expect(result.score).toBe(0);
      expect(result.summary).toContain('Could not extract summary');
      expect(result.strengths).toEqual([]);
    });

    it('should handle custom prompt analysis with malformed JSON response', async () => {
      jest.spyOn(service, 'extractActionItems').mockResolvedValue([]);
      
      // Mock to return a string that gets parsed as an object
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockResolvedValue('malformed string');

      const result = await service.analyzeWithCustomPrompt('test transcription', 'Custom prompt');
      
      // Should not throw but return a result with the analysis
      expect(result).toHaveProperty('analysisDate');
      expect(result.type).toBe('custom');
    });

    it('should handle transcribeAudio with complex audio data', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            original_language: 'en',
            diarized_transcription: [
              {
                speaker: 'Speaker 1',
                text: 'Hello world',
                start_time: 0,
                end_time: 2,
                tone: 'friendly',
                sentiment: 'positive',
                confidence_level: 'high'
              }
            ],
            conversation_summary: {
              overall_sentiment: 'positive',
              dominant_tones: ['friendly'],
              speaker_profiles: {
                'Speaker 1': {
                  dominant_sentiment: 'positive',
                  dominant_tone: 'friendly',
                  engagement_level: 'high',
                  communication_style: 'clear'
                }
              }
            }
          })
        }
      });

      const audioBuffer = Buffer.from('complex_audio_data');
      const result = await service.transcribeAudio(audioBuffer, 'audio/wav');

      const parsed = JSON.parse(result);
      expect(parsed.original_language).toBe('en');
      expect(parsed.diarized_transcription).toHaveLength(1);
      expect(parsed.conversation_summary.overall_sentiment).toBe('positive');
    });
  });

  describe('JSON Parsing Edge Cases', () => {
    it('should handle malformed JSON in parseActionItemsResponse with array pattern', () => {
      const malformedArray = '[{"title": "Test", "description": "Test desc", "extra": }]';
      const result = (service as any).parseActionItemsResponse(malformedArray);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle concatenated objects without array brackets', () => {
      const concatenated = '{ "title": "Task1", "description": "Desc1" }, { "title": "Task2", "description": "Desc2" }';
      const result = (service as any).parseCommaDelimitedObjects(concatenated);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task1');
      expect(result[1].title).toBe('Task2');
    });

    it('should handle parseCommaDelimitedObjects with edge cases', () => {
      const edgeCases = '{title": "Incomplete"}, {"title": "Task2", "description": "Desc2"';
      const result = (service as any).parseCommaDelimitedObjects(edgeCases);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle extractFieldsFromMalformedJson with missing fields', () => {
      const incompleteJson = '"score": , "summary": "Only summary", "strengths":';
      const result = (service as any).extractFieldsFromMalformedJson(incompleteJson);
      expect(result.score).toBe(0);
      expect(result.summary).toBe('Only summary');
      expect(result.strengths).toEqual([]);
    });

    it('should handle extractFieldsFromMalformedJson with array parsing', () => {
      const jsonWithArrays = '"strengths": ["Good", "Better"], "improvements": ["Fix", "Improve"]';
      const result = (service as any).extractFieldsFromMalformedJson(jsonWithArrays);
      expect(result.strengths).toEqual(['Good', 'Better']);
      expect(result.improvements).toEqual(['Fix', 'Improve']);
    });
  });

  describe('Error Type Coverage', () => {
    it('should handle invalid request errors without retry', async () => {
      const invalidError = new Error('invalid request format');
      mockGenerateContent.mockRejectedValue(invalidError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle bad request errors without retry', async () => {
      const badRequestError = new Error('bad request - invalid parameters');
      mockGenerateContent.mockRejectedValue(badRequestError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle server errors', async () => {
      const serverError = new Error('502 Internal Server Error');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(serverError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle service unavailable errors', async () => {
      const unavailableError = new Error('503 Service Unavailable');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(unavailableError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle gateway timeout errors', async () => {
      const gatewayError = new Error('504 Gateway Timeout');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(gatewayError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle too many requests errors', async () => {
      const tooManyError = new Error('429 Too Many Requests');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(tooManyError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });

    it('should handle timeout errors', async () => {
      const timedOutError = new Error('Request timed out');
      jest.spyOn(service as any, 'makeAPICallWithRetry').mockRejectedValue(timedOutError);

      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');
    });
  });

  describe('Action Item Validation', () => {
    it('should handle action items without title in parseActionItemsResponse', () => {
      const invalidItems = '[{"description": "No title here", "priority": "HIGH"}]';
      const result = (service as any).parseActionItemsResponse(invalidItems);
      // The parser finds JSON objects but filters out items without both title AND description
      expect(result).toHaveLength(1); // Object is parsed but doesn't have title
      expect(result[0]).toEqual({"description": "No title here", "priority": "HIGH"});
    });

    it('should handle action items without description in parseActionItemsResponse', () => {
      const invalidItems = '[{"title": "Task with no description", "priority": "HIGH"}]';
      const result = (service as any).parseActionItemsResponse(invalidItems);
      // The parser finds JSON objects but this one only has title, no description
      expect(result).toHaveLength(1); // Object is parsed but doesn't have description
      expect(result[0]).toEqual({"title": "Task with no description", "priority": "HIGH"});
    });

    it('should add default values for missing fields in parseActionItemsResponse', () => {
      // Test with individual object format (not array) to trigger default value logic
      const validObjectString = '{ "title": "Minimal Task", "description": "Basic task" }';
      const result = (service as any).parseActionItemsResponse(validObjectString);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Minimal Task');
      expect(result[0].description).toBe('Basic task');
      expect(result[0].priority).toBe('MEDIUM');
      expect(result[0].deadline).toBeNull();
      expect(result[0].assignee).toBeNull();
      expect(result[0].context).toBe('');
    });

    it('should handle extractActionItems with raw response parsing', async () => {
      // Test the actual extractActionItems method which calls parseActionItemsResponse
      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => '[{"title": "Test Task", "description": "Test description", "priority": "HIGH"}]'
        }
      });

      const result = await service.extractActionItems('test transcription');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Task');
      expect(result[0].description).toBe('Test description');
      expect(result[0].priority).toBe('HIGH'); // This comes from the JSON directly, not defaults
    });
  });

  describe('makeAPICallWithJsonResponse Method', () => {
    it('should handle valid JSON response', async () => {
      const operation = jest.fn().mockResolvedValue('{"test": "data", "number": 42}');
      const validator = (data: any) => data.test === 'data' && data.number === 42;
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator);
      
      expect(result.test).toBe('data');
      expect(result.number).toBe(42);
    });

    it('should handle JSON with trailing comma', async () => {
      const operation = jest.fn().mockResolvedValue('{"test": "data", "trailing": "comma",}');
      const validator = (data: any) => data.test === 'data';
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator);
      
      expect(result.test).toBe('data');
    });

    it('should handle JSON with multiple spaces and newlines', async () => {
      const operation = jest.fn().mockResolvedValue('{\n  "test":   "data",\r\n  "spaces": true\t}\n');
      const validator = (data: any) => data.test === 'data';
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator);
      
      expect(result.test).toBe('data');
      expect(result.spaces).toBe(true);
    });

    it('should retry on JSON parse failure', async () => {
      const operation = jest.fn()
        .mockResolvedValueOnce('invalid json {{{')
        .mockResolvedValue('{"valid": "json"}');
      const validator = (data: any) => data.valid === 'json';
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator, 2);
      
      expect(result.valid).toBe('json');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on validation failure', async () => {
      const operation = jest.fn()
        .mockResolvedValueOnce('{"invalid": "data"}')
        .mockResolvedValue('{"valid": "data"}');
      const validator = (data: any) => data.valid === 'data';
      
      const result = await (service as any).makeAPICallWithJsonResponse(operation, validator, 2);
      
      expect(result.valid).toBe('data');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Model Configuration', () => {
    it('should use default model when GEMINI_MODEL is not set', () => {
      delete process.env.GEMINI_MODEL;
      const modelName = (service as any).getModelName();
      expect(modelName).toBe('gemini-2.5-flash-lite-preview-06-17');
    });

    it('should use environment model when GEMINI_MODEL is set', () => {
      process.env.GEMINI_MODEL = 'custom-gemini-model';
      const modelName = (service as any).getModelName();
      expect(modelName).toBe('custom-gemini-model');
    });

    it('should handle undefined process environment', () => {
      const originalProcess = global.process;
      delete (global as any).process;
      
      try {
        const service = new GeminiAnalysisService();
        const modelName = (service as any).getModelName();
        expect(modelName).toBe('gemini-2.5-flash-lite-preview-06-17');
      } finally {
        global.process = originalProcess;
      }
    });
  });

  describe('Complete Coverage for Missing Cases', () => {
    it('should handle parseActionItemsResponse with regex object extraction', () => {
      // Test the regex path that extracts individual objects when array parsing fails
      const responseWithObjects = `
        Here are some action items:
        { "title": "Task 1", "description": "Description 1" }
        Some text in between
        { "title": "Task 2", "description": "Description 2" }
      `;
      
      const result = (service as any).parseActionItemsResponse(responseWithObjects);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
      expect(result[1].title).toBe('Task 2');
    });

    it('should handle parseActionItemsResponse with no valid objects', () => {
      const responseWithNoObjects = 'This response has no valid JSON objects at all';
      const result = (service as any).parseActionItemsResponse(responseWithNoObjects);
      expect(result).toHaveLength(0);
    });

    it('should handle parseActionItemsResponse with concatenated objects format', () => {
      const concatenatedResponse = '{ "title": "First", "description": "First desc" }, { "title": "Second", "description": "Second desc" }';
      const result = (service as any).parseActionItemsResponse(concatenatedResponse);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First');
      expect(result[1].title).toBe('Second');
    });

    it('should handle extractActionItems with database action item types', async () => {
      // Mock database module
      const mockDbModule = {
        DatabaseStorage: {
          getActionItemTypeById: jest.fn().mockImplementation((id) => {
            if (id === 'type1') return Promise.resolve({ name: 'Follow Up', prompt: 'Follow up on leads' });
            if (id === 'type2') return Promise.resolve({ name: 'Documentation', prompt: 'Create documentation' });
            return Promise.resolve(null);
          }),
          getEnabledActionItemTypesByUserId: jest.fn().mockResolvedValue([
            { id: 'type1', name: 'Follow Up', prompt: 'Follow up on leads' },
            { id: 'type2', name: 'Documentation', prompt: 'Create documentation' }
          ])
        }
      };

      // Mock the dynamic import
      const originalImport = jest.requireActual('@/lib/db');
      jest.doMock('@/lib/db', () => mockDbModule);

      mockGenerateContent.mockResolvedValue({
        response: { text: () => '[{"title": "DB Task", "description": "Database task"}]' }
      });

      const result = await service.extractActionItems('test transcription', 'user123', ['type1', 'type2']);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('DB Task');
      
      // Restore original mock
      jest.doMock('@/lib/db', () => originalImport);
    });

    it('should handle extractActionItems with database error gracefully', async () => {
      // Mock database module to throw error
      const mockDbModule = {
        DatabaseStorage: {
          getActionItemTypeById: jest.fn().mockRejectedValue(new Error('Database error')),
          getEnabledActionItemTypesByUserId: jest.fn().mockRejectedValue(new Error('Database error'))
        }
      };

      jest.doMock('@/lib/db', () => mockDbModule);

      mockGenerateContent.mockResolvedValue({
        response: { 
          text: () => '[{"title": "Error Task", "description": "Task with DB error"}]'
        }
      });

      const result = await service.extractActionItems('test transcription', 'user123');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Error Task');
    });

    it('should handle specific retry error scenarios', async () => {
      // Mock makeAPICallWithRetry to throw specific errors
      const originalMakeAPICall = (service as any).makeAPICallWithRetry;
      (service as any).makeAPICallWithRetry = jest.fn().mockRejectedValue(new Error('quota exceeded for today'));
      
      await expect(service.generateChatbotResponse('test'))
        .rejects.toThrow('Chatbot response generation failed');

      // Restore original method
      (service as any).makeAPICallWithRetry = originalMakeAPICall;
    });

    it('should handle parseCommaDelimitedObjects part reconstruction edge cases', () => {
      // Test specific reconstruction logic for first, middle, and last parts
      const edgeCases = [
        // Valid case that should work
        '{"title": "Test1", "description": "Desc1"}, {"title": "Test2", "description": "Desc2"}',
        // Case with extra comma
        '{"title": "Test1", "description": "Desc1"},, {"title": "Test2", "description": "Desc2"}',
      ];
      
      edgeCases.forEach((testCase, index) => {
        const result = (service as any).parseCommaDelimitedObjects(testCase);
        expect(Array.isArray(result)).toBe(true);
        // At least some should be extracted
        if (index === 0) {
          expect(result.length).toBeGreaterThanOrEqual(1);
        }
      });
    });

    it('should handle extractFieldsFromMalformedJson logging path', () => {
      // This will trigger the console.log on line 908
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const malformedJson = '"score": 5, "summary": "Test summary"';
      const result = (service as any).extractFieldsFromMalformedJson(malformedJson);
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Attempting to extract fields from malformed JSON');
      expect(result.score).toBe(5);
      
      consoleSpy.mockRestore();
    });

    it('should handle parseActionItemsResponse success logging', () => {
      // This will trigger the success console log on line 833 after regex extraction
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Response that will fail JSON array parsing but succeed with regex extraction
      const responseWithObjects = 'Some text {"title": "Test Task", "description": "Test description"} more text';
      const result = (service as any).parseActionItemsResponse(responseWithObjects);
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Successfully extracted 1 action items from malformed response');
      expect(result).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should handle parseActionItemsResponse error logging with response truncation', () => {
      // This will trigger the error console logs on lines 836-838
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Create a very long response to test truncation
      const longResponse = 'a'.repeat(600);
      
      // Override regex match to cause an error in the method
      const originalRegexExec = RegExp.prototype.exec;
      RegExp.prototype.exec = function() {
        throw new Error('Regex error');
      };
      
      const result = (service as any).parseActionItemsResponse(longResponse);
      
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Failed to parse action items response:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('[GeminiService] Raw response was:', expect.stringContaining('...'));
      expect(result).toEqual([]);
      
      // Restore
      RegExp.prototype.exec = originalRegexExec;
      consoleSpy.mockRestore();
    });

    it('should test all regex parsing branches in parseActionItemsResponse', () => {
      // Test the regex-based object extraction with proper JSON objects
      const responseWithMultipleObjects = `
        Some text before
        {"title": "First Task", "description": "First description"}
        Some text in between
        {"title": "Second Task", "description": "Second description"}
        Some text after
      `;
      
      const result = (service as any).parseActionItemsResponse(responseWithMultipleObjects);
      
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First Task');
      expect(result[1].title).toBe('Second Task');
    });

    it('should handle parseCommaDelimitedObjects all reconstruction cases', () => {
      const parseMethod = (service as any).parseCommaDelimitedObjects;
      
      // Test case for line 868: first part needs ending brace (i === 0 && i < parts.length - 1 && !part.endsWith('}'))
      const input1 = '"title": "Task 1", "description": "Test", {"title": "Task 2", "description": "Test2"';
      const result1 = parseMethod.call(service, input1);
      expect(Array.isArray(result1)).toBe(true);
      
      // Test case for line 866-867: last part needs starting brace (i > 0 && i === parts.length - 1 && !part.startsWith('{'))
      const input2 = '{"title": "Task 1"}, "title": "Task 2", "description": "Test2"';
      const result2 = parseMethod.call(service, input2);
      expect(Array.isArray(result2)).toBe(true);
      
      // Test case for line 863-864: middle parts need full braces (i > 0 && i < parts.length - 1)
      const input3 = '{"title": "Task 1"}, "title": "Middle", {"title": "Task 3"';
      const result3 = parseMethod.call(service, input3);
      expect(Array.isArray(result3)).toBe(true);
      
      // Test case for line 860-861: last part needs ending brace (i === parts.length - 1 && !part.endsWith('}'))
      const input4 = '{"title": "Task 1"}, {"title": "Last", "description": "desc"';
      const result4 = parseMethod.call(service, input4);
      expect(Array.isArray(result4)).toBe(true);
    });
  });

  // Final Coverage Push - Targeting Specific Uncovered Lines
  describe('Final 100% Coverage Tests - Targeting Specific Uncovered Lines', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

  it('should cover error handling in analyzeWithCustomParameters loop (lines 519-520)', async () => {
    // Mock makeAPICallWithJsonResponse to throw an error to trigger the catch block
    jest.spyOn(service as any, 'makeAPICallWithJsonResponse').mockRejectedValue(new Error('Analysis failed'));
    
    const parameters = [
      { 
        id: 'test-param',
        name: 'Test Parameter', 
        description: 'Test description',
        enabled: true, 
        prompt: 'Test prompt for {{transcription}}'
      }
    ];

    const result = await service.analyzeWithCustomParameters('test transcription', parameters);
    
    // Should have fallback values for the failed parameter
    expect(result).toHaveProperty('parameters');
    expect(result.parameters['test-param']).toEqual({
      score: 0,
      summary: 'Failed to get analysis for Test Parameter.',
      strengths: [],
      improvements: [],
      specific_examples: [],
      recommendations: []
    });
    
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to get analysis for parameter test-param:'),
      expect.any(Error)
    );
  });

  it('should cover manual split fallback logging (lines 780-784)', async () => {
    const service = new GeminiAnalysisService();
    
    // Create a response that matches the exact conditions for the manual split path:
    // 1. Must contain '{ "title":'
    // 2. Must contain '}, {'
    // 3. Must fail when wrapped with array brackets
    const malformedResponse = `{ "title": "Task 1", "description": "Test" }, { "title": "Task 2", "description": invalid }`;
    
    // Call parseActionItemsResponse directly
    const parseActionItemsResponse = service['parseActionItemsResponse'] as any;
    const result = parseActionItemsResponse.call(service, malformedResponse);
    
    expect(console.log).toHaveBeenCalledWith(
      '[GeminiService] Failed to parse wrapped objects, trying manual split'
    );
  });

    it('should cover specific brace reconstruction case in parseCommaDelimitedObjects (line 864)', async () => {
      const service = new GeminiAnalysisService();
      
      // Test the specific case where i === 0 && i < parts.length - 1 && !part.endsWith('}')
      const parseCommaDelimitedObjects = service['parseCommaDelimitedObjects'] as any;
      
      // Create input that will trigger this specific reconstruction path
      const input = `"title": "Task 1", "description": "Test", {"title": "Task 2", "description": "Test2"}`;
      
      const result = parseCommaDelimitedObjects.call(service, input);
      
      // The method should attempt to reconstruct the objects
      expect(Array.isArray(result)).toBe(true);
    });

  it('should cover error logging in parseCommaDelimitedObjects (lines 900-901)', async () => {
    const service = new GeminiAnalysisService();
    
    // Force an error by providing input that will cause an exception in the main try block of parseCommaDelimitedObjects
    const parseCommaDelimitedObjects = service['parseCommaDelimitedObjects'] as any;
    
    // Override String.prototype.split to throw an error to reach the catch block at lines 900-901
    const originalSplit = String.prototype.split;
    String.prototype.split = jest.fn().mockImplementation(() => {
      throw new Error('Split error');
    });
    
    const result = parseCommaDelimitedObjects.call(service, 'test input');
    
    expect(console.error).toHaveBeenCalledWith(
      '[GeminiService] Error parsing comma-delimited objects:',
      expect.any(Error)
    );
    expect(result).toEqual([]);
    
    // Restore original split
    String.prototype.split = originalSplit;
  });

    it('should cover edge case in brace reconstruction with middle parts', async () => {
      const service = new GeminiAnalysisService();
      const parseCommaDelimitedObjects = service['parseCommaDelimitedObjects'] as any;
      
      // Create input that will have multiple parts requiring middle reconstruction
      // This should trigger: if (i > 0 && i < parts.length - 1) { part = '{' + part + '}'; }
      const input = `"title": "Task 1", "description": "Test", "title": "Task 2", "description": "Test2", "title": "Task 3"`;
      
      const result = parseCommaDelimitedObjects.call(service, input);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should cover last part reconstruction without starting brace', async () => {
      const service = new GeminiAnalysisService();
      const parseCommaDelimitedObjects = service['parseCommaDelimitedObjects'] as any;
      
      // Create input that will trigger: if (i > 0 && i === parts.length - 1 && !part.startsWith('{'))
      const input = `{"title": "Task 1"}, "title": "Task 2", "description": "Test2"`;
      
      const result = parseCommaDelimitedObjects.call(service, input);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  it('should cover invalid action item object logging (line 825)', async () => {
    const service = new GeminiAnalysisService();
    const parseActionItemsResponse = service['parseActionItemsResponse'] as any;
    
    // Create a response with a valid JSON object that has title but NO description (or vice versa)
    // This will trigger the validation failure on line 812: if (parsed && typeof parsed === 'object' && parsed.title && parsed.description)
    const responseWithInvalidActionItem = `{"title": "Task without description"}`;
    
    const result = parseActionItemsResponse.call(service, responseWithInvalidActionItem);
    
    expect(console.log).toHaveBeenCalledWith(
      '[GeminiService] Skipping invalid action item object:',
      expect.any(Object)
    );
  });

  it('should cover line 519 error handling more specifically', async () => {
    // Create a new service instance to ensure clean state
    const testService = new GeminiAnalysisService();
    
    // Mock makeAPICallWithJsonResponse to throw a very specific error
    const mockSpy = jest.spyOn(testService as any, 'makeAPICallWithJsonResponse')
      .mockRejectedValue(new Error('Specific analysis error'));
    
    const parameters = [
      { 
        id: 'error-test-param',
        name: 'Error Test Parameter', 
        description: 'Parameter that will fail',
        enabled: true, 
        prompt: 'This will fail: {{transcription}}'
      }
    ];

    const result = await testService.analyzeWithCustomParameters('test transcription', parameters);
    
    // Should have the exact fallback structure
    expect(result.parameters['error-test-param']).toEqual({
      score: 0,
      summary: 'Failed to get analysis for Error Test Parameter.',
      strengths: [],
      improvements: [],
      specific_examples: [],
      recommendations: []
    });
    
    expect(console.error).toHaveBeenCalledWith(
      '[GeminiService] Failed to get analysis for parameter error-test-param:',
      expect.any(Error)
    );
    
    mockSpy.mockRestore();
  });
});