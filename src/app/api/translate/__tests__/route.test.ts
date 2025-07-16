import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';

// Mock the dependencies
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/gemini', () => ({
  geminiService: {
    generateChatbotResponse: jest.fn(),
  },
}));

import { getAuthenticatedUser } from '@/lib/auth';
import { geminiService } from '@/lib/gemini';

describe('/api/translate API Route', () => {
  const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
  const mockGeminiService = geminiService as jest.Mocked<typeof geminiService>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/translate', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if text is missing', async () => {
      const mockUser = { id: 'user123' };
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Text and target language are required');
    });

    it('should return 400 if targetLanguage is missing', async () => {
      const mockUser = { id: 'user123' };
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Text and target language are required');
    });

    it('should translate text successfully', async () => {
      const mockUser = { id: 'user123' };
      const mockTranslatedText = '¡Hola, mundo!';
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue(mockTranslatedText);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translatedText).toBe(mockTranslatedText);
      expect(data.sourceLanguage).toBe('auto');
      expect(data.targetLanguage).toBe('es');
    });

    it('should use custom sourceLanguage when provided', async () => {
      const mockUser = { id: 'user123' };
      const mockTranslatedText = 'Bonjour, le monde!';
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue(mockTranslatedText);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          targetLanguage: 'fr',
          sourceLanguage: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sourceLanguage).toBe('en');
      expect(data.targetLanguage).toBe('fr');
    });

    it('should pass correct prompt to gemini service', async () => {
      const mockUser = { id: 'user123' };
      const inputText = 'Speaker 1: Hello there!\nSpeaker 2: How are you?';
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('Translated text');
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: inputText,
          targetLanguage: 'es',
        }),
      });
      
      await POST(request);

      expect(mockGeminiService.generateChatbotResponse).toHaveBeenCalledWith(
        expect.stringContaining('Please translate the following text to Spanish')
      );
      expect(mockGeminiService.generateChatbotResponse).toHaveBeenCalledWith(
        expect.stringContaining(inputText)
      );
      expect(mockGeminiService.generateChatbotResponse).toHaveBeenCalledWith(
        expect.stringContaining('keep them intact')
      );
    });

    it('should handle different target languages correctly', async () => {
      const mockUser = { id: 'user123' };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('Translated');

      const testCases = [
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'ja', name: 'Japanese' },
        { code: 'zh', name: 'Chinese (Simplified)' },
        { code: 'hi', name: 'Hindi' },
        { code: 'unknown', name: 'unknown' }, // Unknown language code
      ];

      for (const testCase of testCases) {
        mockGeminiService.generateChatbotResponse.mockClear();
        
        const request = new NextRequest('http://localhost:3000/api/translate', {
          method: 'POST',
          body: JSON.stringify({
            text: 'Test text',
            targetLanguage: testCase.code,
          }),
        });
        
        await POST(request);

        expect(mockGeminiService.generateChatbotResponse).toHaveBeenCalledWith(
          expect.stringContaining(`translate the following text to ${testCase.name}`)
        );
      }
    });

    it('should handle translation errors gracefully', async () => {
      const mockUser = { id: 'user123' };
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockRejectedValue(new Error('Gemini API error'));
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Translation failed');
      expect(console.error).toHaveBeenCalledWith('[Translation] Error:', expect.any(Error));
    });

    it('should handle authentication errors gracefully', async () => {
      mockGetAuthenticatedUser.mockRejectedValue(new Error('Auth service error'));
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Translation failed');
    });

    it('should log translation details', async () => {
      const mockUser = { id: 'user123' };
      const inputText = 'Hello, world!';
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('Translated');
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: inputText,
          targetLanguage: 'es',
        }),
      });
      
      await POST(request);

      expect(console.log).toHaveBeenCalledWith('[Translation] Translating text to:', 'es');
      expect(console.log).toHaveBeenCalledWith('[Translation] Text length:', inputText.length);
      expect(console.log).toHaveBeenCalledWith('[Translation] Translation completed successfully');
    });

    it('should handle malformed JSON in request body', async () => {
      const mockUser = { id: 'user123' };
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: 'invalid json',
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Translation failed');
    });

    it('should handle empty text correctly', async () => {
      const mockUser = { id: 'user123' };
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: '',
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Text and target language are required');
    });

    it('should handle long text translation', async () => {
      const mockUser = { id: 'user123' };
      const longText = 'A'.repeat(10000); // 10KB of text
      
      mockGetAuthenticatedUser.mockResolvedValue(mockUser as any);
      mockGeminiService.generateChatbotResponse.mockResolvedValue('Translated long text');
      
      const request = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: longText,
          targetLanguage: 'es',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(console.log).toHaveBeenCalledWith('[Translation] Text length:', 10000);
    });
  });
});
