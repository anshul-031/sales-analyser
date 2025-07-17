

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { geminiService } from '@/lib/gemini';
import { Logger } from '@/lib/utils';

// Mock dependencies
jest.mock('@/lib/gemini');
jest.mock('@/lib/utils', () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  GeminiCircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockImplementation(async (operation) => operation()),
  })),
}));

describe('POST /api/analyze-transcription', () => {
  const mockRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if transcription or customPrompt is missing', async () => {
    const req = mockRequest({ transcription: 'test' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Missing transcription or custom prompt');

    const req2 = mockRequest({ customPrompt: 'test' });
    const res2 = await POST(req2);
    const json2 = await res2.json();

    expect(res2.status).toBe(400);
    expect(json2.success).toBe(false);
    expect(json2.error).toBe('Missing transcription or custom prompt');
  });

  it('should process plain text transcription and return analysis', async () => {
    const req = mockRequest({
      transcription: 'Speaker A: Hello. Speaker B: Hi.',
      customPrompt: 'Summarize the call.',
      recordingIds: ['123'],
    });

    (geminiService.generateChatbotResponse as jest.Mock).mockResolvedValue('This is a summary.');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.analysis).toBe('This is a summary.');
    expect(Logger.info).toHaveBeenCalledWith('[AnalyzeTranscription] Starting custom analysis for', 1, 'recordings');
    expect(Logger.warn).toHaveBeenCalledWith('[AnalyzeTranscription] Transcription is not a valid JSON, using as plain text.');
    expect(geminiService.generateChatbotResponse).toHaveBeenCalled();
  });

  it('should process diarized transcription and return analysis', async () => {
    const diarizedTranscription = {
      diarized_transcription: [
        { speaker: 'A', text: 'Hello.' },
        { speaker: 'B', text: 'Hi.' },
      ],
    };
    const req = mockRequest({
      transcription: JSON.stringify(diarizedTranscription),
      customPrompt: 'Summarize the call.',
      recordingIds: ['123', '456'],
    });

    (geminiService.generateChatbotResponse as jest.Mock).mockResolvedValue('This is a summary.');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.analysis).toBe('This is a summary.');
    expect(Logger.info).toHaveBeenCalledWith('[AnalyzeTranscription] Starting custom analysis for', 2, 'recordings');
    expect(geminiService.generateChatbotResponse).toHaveBeenCalledWith(expect.stringContaining('A: Hello.\nB: Hi.'));
  });

  it('should process translated transcription and return analysis', async () => {
    const translatedTranscription = {
        diarized_transcription: [
            { speaker: 'A', text: 'Bonjour.' },
            { speaker: 'B', text: 'Salut.' },
          ],
      english_translation: [
        { speaker: 'A', text: 'Hello.' },
        { speaker: 'B', text: 'Hi.' },
      ],
    };
    const req = mockRequest({
      transcription: JSON.stringify(translatedTranscription),
      customPrompt: 'Summarize the call.',
    });

    (geminiService.generateChatbotResponse as jest.Mock).mockResolvedValue('This is a summary.');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.analysis).toBe('This is a summary.');
    expect(Logger.info).toHaveBeenCalledWith('[AnalyzeTranscription] Starting custom analysis for', 0, 'recordings');
    expect(geminiService.generateChatbotResponse).toHaveBeenCalledWith(expect.stringContaining('A: Hello.\nB: Hi.'));
  });

  it('should handle valid JSON transcription without diarized_transcription', async () => {
    const req = mockRequest({
      transcription: JSON.stringify({ some_other_key: 'some_value' }),
      customPrompt: 'Summarize the call.',
    });

    (geminiService.generateChatbotResponse as jest.Mock).mockResolvedValue('This is a summary.');

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.analysis).toBe('This is a summary.');
    expect(Logger.warn).not.toHaveBeenCalled();
    expect(geminiService.generateChatbotResponse).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify({ some_other_key: 'some_value' })));
  });

  it('should handle errors during analysis', async () => {
    const req = mockRequest({
      transcription: 'Speaker A: Hello.',
      customPrompt: 'Summarize.',
    });

    const error = new Error('Gemini error');
    (geminiService.generateChatbotResponse as jest.Mock).mockRejectedValue(error);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Gemini error');
    expect(Logger.error).toHaveBeenCalledWith('[AnalyzeTranscription] Error during analysis:', error);
  });

  it('should handle non-Error objects during analysis failure', async () => {
    const req = mockRequest({
      transcription: 'Speaker A: Hello.',
      customPrompt: 'Summarize.',
    });

    const error = 'A simple string error';
    (geminiService.generateChatbotResponse as jest.Mock).mockRejectedValue(error);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Analysis failed');
    expect(Logger.error).toHaveBeenCalledWith('[AnalyzeTranscription] Error during analysis:', error);
  });
});
