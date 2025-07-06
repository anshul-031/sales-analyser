import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from './utils';
import { DEFAULT_ANALYSIS_PARAMETERS } from './analysis-constants';

// Re-export for backward compatibility
export { DEFAULT_ANALYSIS_PARAMETERS };

// Round-robin API key management
class GeminiAPIKeyManager {
  private apiKeys: string[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadAPIKeys();
  }

  private loadAPIKeys() {
    try {
      // Only load API keys on server side
      if (typeof process === 'undefined' || !process.env) {
        Logger.warn('[GeminiAPIKeyManager] Skipping API key loading on client side');
        return;
      }

      const apiKeysEnv = process.env.GOOGLE_GEMINI_API_KEYS;
      if (!apiKeysEnv) {
        Logger.warn('[GeminiAPIKeyManager] Warning: GOOGLE_GEMINI_API_KEYS not found in environment variables');
        return;
      }

      // Parse the JSON array from environment variable
      this.apiKeys = JSON.parse(apiKeysEnv);
      
      if (!Array.isArray(this.apiKeys) || this.apiKeys.length === 0) {
        Logger.warn('[GeminiAPIKeyManager] Warning: GOOGLE_GEMINI_API_KEYS should be a non-empty JSON array');
        this.apiKeys = [];
        return;
      }

      // Filter out invalid keys
      this.apiKeys = this.apiKeys.filter(key => key && typeof key === 'string' && key.trim().length > 0);
      
      if (this.apiKeys.length === 0) {
        Logger.warn('[GeminiAPIKeyManager] Warning: No valid API keys found in GOOGLE_GEMINI_API_KEYS');
      } else {
        Logger.info(`[GeminiAPIKeyManager] Loaded ${this.apiKeys.length} API key(s) for round-robin usage`);
      }
    } catch (error) {
      Logger.error('[GeminiAPIKeyManager] Error parsing GOOGLE_GEMINI_API_KEYS:', error);
      this.apiKeys = [];
    }
  }

  getCurrentAPIKey(): string {
    // Throw error if called on client side
    if (typeof process === 'undefined' || !process.env) {
      throw new Error('Gemini API keys are not available on client side for security reasons');
    }

    if (this.apiKeys.length === 0) {
      throw new Error('No valid Google Gemini API keys configured. Please update GOOGLE_GEMINI_API_KEYS in .env file with a JSON array of API keys.');
    }

    const currentKey = this.apiKeys[this.currentIndex];
    Logger.debug(`[GeminiAPIKeyManager] Using API key ${this.currentIndex + 1}/${this.apiKeys.length} (${currentKey.substring(0, 10)}...)`);
    
    return currentKey;
  }

  getNextAPIKey(): string {
    // Throw error if called on client side
    if (typeof process === 'undefined' || !process.env) {
      throw new Error('Gemini API keys are not available on client side for security reasons');
    }

    if (this.apiKeys.length === 0) {
      throw new Error('No valid Google Gemini API keys configured. Please update GOOGLE_GEMINI_API_KEYS in .env file with a JSON array of API keys.');
    }

    const currentKey = this.apiKeys[this.currentIndex];
    Logger.debug(`[GeminiAPIKeyManager] Using API key ${this.currentIndex + 1}/${this.apiKeys.length} (${currentKey.substring(0, 10)}...)`);
    
    // Automatically rotate to next key for round-robin usage
    this.rotateToNextKey();
    
    return currentKey;
  }

  rotateToNextKey(): void {
    if (this.apiKeys.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      Logger.debug(`[GeminiAPIKeyManager] Rotated to API key ${this.currentIndex + 1}/${this.apiKeys.length} for next request`);
    }
  }

  getKeyCount(): number {
    return this.apiKeys.length;
  }
}

// Initialize the API key manager
const apiKeyManager = new GeminiAPIKeyManager();

export class GeminiAnalysisService {
  private getModelName(): string {
    // Get the model name from environment variable, fallback to default
    const modelName = (typeof process !== 'undefined' && process.env) ? process.env.GEMINI_MODEL : 'gemini-2.5-flash-lite-preview-06-17';
    return modelName || 'gemini-2.5-flash-lite-preview-06-17';
  }

  private getCurrentModel() {
    // Get next API key in round-robin fashion and create a new client
    const currentApiKey = apiKeyManager.getNextAPIKey();
    const genAI = new GoogleGenerativeAI(currentApiKey);
    const modelName = this.getModelName();
    return genAI.getGenerativeModel({ model: modelName });
  }

  private async makeAPICallWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = apiKeyManager.getKeyCount(),
    operationName: string = 'API Call'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        Logger.analysis(`${operationName} attempt ${attempt + 1}/${maxRetries}`);
        const startTime = Date.now();
        
        const result = await operation();
        
        const duration = Date.now() - startTime;
        Logger.performance(`${operationName}`, duration);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        Logger.error(`${operationName} failed on attempt ${attempt + 1}:`, error);
        
        // Enhanced error categorization for production debugging
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();
          
          if (errorMessage.includes('quota_exceeded') || 
              errorMessage.includes('rate_limit_exceeded') ||
              errorMessage.includes('429') ||
              errorMessage.includes('too many requests')) {
            Logger.warn(`[GeminiService] Rate limit detected on attempt ${attempt + 1}, trying next API key...`);
            
            // Add exponential backoff for rate limits
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            
          } else if (errorMessage.includes('permission_denied') || 
                     errorMessage.includes('api key') ||
                     errorMessage.includes('authentication')) {
            Logger.error(`[GeminiService] Authentication error: ${error.message}`);
            // Don't retry auth errors
            break;
            
          } else if (errorMessage.includes('timeout') || 
                     errorMessage.includes('timed out')) {
            Logger.warn(`[GeminiService] Timeout error on attempt ${attempt + 1}: ${error.message}`);
            
            // For timeout errors, add longer delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } else if (errorMessage.includes('invalid') || 
                     errorMessage.includes('bad request')) {
            Logger.error(`[GeminiService] Invalid request error: ${error.message}`);
            // Don't retry invalid requests
            break;
            
          } else {
            Logger.warn(`[GeminiService] Unknown error on attempt ${attempt + 1}: ${error.message}`);
            // Add short delay for unknown errors
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Production logging for critical errors
          if (process.env.NODE_ENV === 'production') {
            Logger.production('error', `Gemini API Error - Attempt ${attempt + 1}/${maxRetries}`, {
              operationName,
              errorMessage: error.message,
              errorType: errorMessage.includes('quota') ? 'QUOTA' : 
                         errorMessage.includes('auth') ? 'AUTH' : 
                         errorMessage.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN'
            });
          }
        }
        
        // If this is the last attempt or a non-retryable error, don't continue
        if (attempt === maxRetries - 1) {
          break;
        }
      }
    }
    
    // Log final failure
    Logger.production('error', `Gemini API Call Failed After All Retries`, {
      operationName,
      maxRetries,
      finalError: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  constructor() {
    const modelName = this.getModelName();
    Logger.info(`[GeminiService] Initialized with ${apiKeyManager.getKeyCount()} API key(s) and ${modelName} model`);
  }

  private async makeAPICallWithJsonResponse<T>(
    operation: () => Promise<string>,
    validator: (data: any) => boolean,
    maxRetries: number = apiKeyManager.getKeyCount()
  ): Promise<T> {
    return this.makeAPICallWithRetry(async () => {
      const rawResponse = await operation();
      
      // Attempt to extract a valid JSON object from the raw response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[GeminiService] No JSON object found in response:', rawResponse);
        throw new Error('No JSON object found in response');
      }

      let jsonStr = jsonMatch[0];
      try {
        // Clean up the JSON string before parsing
        jsonStr = jsonStr
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ');
        
        const parsedJson = JSON.parse(jsonStr);

        if (!validator(parsedJson)) {
          console.error('[GeminiService] JSON validation failed:', parsedJson);
          throw new Error('JSON validation failed');
        }

        return parsedJson as T;
      } catch (error) {
        console.error('[GeminiService] JSON parse or validation error:', error);
        console.error('[GeminiService] Raw JSON string that failed:', jsonStr);
        // Throwing an error here will trigger the retry mechanism of makeAPICallWithRetry
        throw new Error('Failed to parse or validate JSON response');
      }
    }, maxRetries);
  }

  /**
   * Transcribe audio content using Gemini API
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    Logger.analysis(`Starting audio transcription, size: ${audioBuffer.length} bytes`);
    
    const base64Audio = audioBuffer.toString('base64');
    const prompt = `Please transcribe this audio file with the following requirements:
1.  **Speaker Diarization**: Identify and label each speaker (e.g., "Speaker 1", "Speaker 2").
2.  **Transcription**: Provide a verbatim transcription of the conversation.
3.  **Timestamps**: Include start and end times for each speaker segment.
4.  **Language Identification**: Identify the original language of the conversation.
5.  **Tone Analysis**: Analyze the tone of each speaker segment (e.g., "professional", "friendly", "aggressive", "uncertain", "confident", "frustrated", "enthusiastic", "calm").
6.  **Sentiment Analysis**: Determine the sentiment of each speaker segment (e.g., "positive", "negative", "neutral", "mixed").

Return the result in a JSON object with the following structure.
IMPORTANT: Your response must be a single, valid JSON object and nothing else. Do not include any text before or after the JSON object.
{
  "original_language": "<identified language>",
  "diarized_transcription": [
    {
      "speaker": "<speaker_label>",
      "text": "<transcribed_text>",
      "start_time": <start_seconds>,
      "end_time": <end_seconds>,
      "tone": "<tone_analysis>",
      "sentiment": "<sentiment_analysis>",
      "confidence_level": "<low|medium|high>"
    },
    ...
  ],
  "conversation_summary": {
    "overall_sentiment": "<overall_conversation_sentiment>",
    "dominant_tones": ["<tone1>", "<tone2>"],
    "speaker_profiles": {
      "<speaker_label>": {
        "dominant_sentiment": "<sentiment>",
        "dominant_tone": "<tone>",
        "engagement_level": "<low|medium|high>",
        "communication_style": "<description>"
      }
    }
  }
}`;
    
    try {
      const transcription = await this.makeAPICallWithRetry(async () => {
        const model = this.getCurrentModel();
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Audio,
              mimeType: mimeType,
            },
          },
        ]);

        const response = await result.response;
        return response.text();
      });
      
      Logger.analysis(`Transcription completed, length: ${transcription.length} characters`);
      
      // Extract JSON from response
      const jsonMatch = transcription.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      
      // Fallback for non-JSON responses
      return JSON.stringify({
        original_language: "unknown",
        diarized_transcription: [{ 
          speaker: "unknown", 
          text: transcription,
          tone: "neutral",
          sentiment: "neutral",
          confidence_level: "low"
        }],
        conversation_summary: {
          overall_sentiment: "neutral",
          dominant_tones: ["neutral"],
          speaker_profiles: {}
        }
      });
    } catch (error) {
      console.error('[GeminiService] Transcription error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new Error('Invalid Google Gemini API key. Please check your GOOGLE_GEMINI_API_KEYS in the .env file. Visit https://aistudio.google.com/ to get valid API keys.');
        }
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Google Gemini API key is invalid. Please update GOOGLE_GEMINI_API_KEYS in your .env file with valid keys from https://aistudio.google.com/');
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied for Google Gemini API. Please check your API key permissions and quotas.');
        }
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Google Gemini API quota exceeded. All configured API keys have reached their limits. Please check your usage limits in Google AI Studio.');
        }
      }
      
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze sales call using custom parameters
   */
  async analyzeWithCustomParameters(transcription: string, parameters: Array<{id: string; name: string; description: string; prompt: string; enabled: boolean}>): Promise<any> {
    try {
      console.log('[GeminiService] Starting custom parameters analysis');
      
      const enabledParameters = parameters.filter(p => p.enabled);
      const customResults: any = {};

      for (const parameter of enabledParameters) {
        const prompt = `${parameter.prompt}
 
Sales Call Transcription:
${transcription}
 
Please provide your analysis for "${parameter.name}" in the following JSON format.
IMPORTANT: Your response must be a single, valid JSON object and nothing else. Do not include any text before or after the JSON object.
{
  "score": <number from 1-10>,
  "summary": "<brief summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "specific_examples": ["<example 1>", "<example 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;
        
        try {
          const analysisResult = await this.makeAPICallWithJsonResponse<{
            score: number;
            summary: string;
            strengths: string[];
            improvements: string[];
            specific_examples: string[];
            recommendations: string[];
          }>(async () => {
            const model = this.getCurrentModel();
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          }, (data) => {
            return 'score' in data && 'summary' in data && 'strengths' in data && 'improvements' in data && 'specific_examples' in data && 'recommendations' in data;
          });
          customResults[parameter.id] = analysisResult;
        } catch (error) {
          console.error(`[GeminiService] Failed to get analysis for parameter ${parameter.id}:`, error);
          customResults[parameter.id] = {
            score: 0,
            summary: `Failed to get analysis for ${parameter.name}.`,
            strengths: [],
            improvements: [],
            specific_examples: [],
            recommendations: []
          };
        }
      }
      
      // Calculate overall score
      const customScores = Object.values(customResults).map((r: any) => r.score).filter(s => s > 0);
      const customOverallScore = customScores.length > 0 ? Math.round(customScores.reduce((a, b) => a + b, 0) / customScores.length) : 0;
      
      console.log('[GeminiService] Custom parameters analysis completed');
      
      return {
        type: 'parameters',
        overallScore: customOverallScore,
        analysisDate: new Date().toISOString(),
        parameters: customResults,
        parameterNames: enabledParameters.reduce((acc, param) => {
          acc[param.id] = param.name;
          return acc;
        }, {} as Record<string, string>)
      };
    } catch (error) {
      console.error('[GeminiService] Custom parameters analysis error:', error);
      throw new Error(`Custom parameters analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze sales call using default parameters
   */
  async analyzeWithDefaultParameters(transcription: string): Promise<any> {
    try {
      console.log('[GeminiService] Starting default analysis');
      
      const results: any = {};
      const parameterKeys = Object.keys(DEFAULT_ANALYSIS_PARAMETERS);

      for (const key of parameterKeys) {
        const parameter = DEFAULT_ANALYSIS_PARAMETERS[key as keyof typeof DEFAULT_ANALYSIS_PARAMETERS];
        const prompt = `${parameter.prompt}

Sales Call Transcription:
${transcription}

Please provide your analysis for "${parameter.name}" in the following JSON format.
IMPORTANT: Your response must be a single, valid JSON object and nothing else. Do not include any text before or after the JSON object.
{
  "score": <number from 1-10>,
  "summary": "<brief summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "specific_examples": ["<example 1>", "<example 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;

        try {
          const analysisResult = await this.makeAPICallWithJsonResponse<{
            score: number;
            summary: string;
            strengths: string[];
            improvements: string[];
            specific_examples: string[];
            recommendations: string[];
          }>(async () => {
            const model = this.getCurrentModel();
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
          }, (data) => {
            return 'score' in data && 'summary' in data && 'strengths' in data && 'improvements' in data && 'specific_examples' in data && 'recommendations' in data;
          });
          results[key] = analysisResult;
        } catch (error) {
          console.error(`[GeminiService] Failed to get analysis for parameter ${key}:`, error);
          results[key] = {
            score: 0,
            summary: `Failed to get analysis for ${parameter.name}.`,
            strengths: [],
            improvements: [],
            specific_examples: [],
            recommendations: []
          };
        }
      }
      
      // Calculate overall score
      const scores = Object.values(results).map((r: any) => r.score).filter(s => s > 0);
      const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      
      console.log('[GeminiService] Default analysis completed');
      
      return {
        type: 'default',
        overallScore,
        analysisDate: new Date().toISOString(),
        parameters: results,
        parameterNames: Object.entries(DEFAULT_ANALYSIS_PARAMETERS).reduce((acc, [key, param]) => {
          acc[key] = param.name;
          return acc;
        }, {} as Record<string, string>)
      };
    } catch (error) {
      console.error('[GeminiService] Default analysis error:', error);
      throw new Error(`Default analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze sales call with custom prompt
   */
  async analyzeWithCustomPrompt(transcription: string, customPrompt: string): Promise<any> {
    try {
      console.log('[GeminiService] Starting custom analysis');
      
      const prompt = `${customPrompt}

Sales Call Transcription:
${transcription}

Please provide a comprehensive analysis based on the instructions above. Format your response as JSON with the following structure.
IMPORTANT: Your response must be a single, valid JSON object and nothing else. Do not include any text before or after the JSON object.
{
  "summary": "<overall summary>",
  "key_findings": ["<finding 1>", "<finding 2>"],
  "scores": {
    "<aspect 1>": <score 1-10>,
    "<aspect 2>": <score 1-10>
  },
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "specific_examples": ["<example 1>", "<example 2>"]
}`;

      const analysisResult = await this.makeAPICallWithJsonResponse<any>(async () => {
        const model = this.getCurrentModel();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }, (data) => {
        return 'summary' in data && 'key_findings' in data && 'scores' in data && 'recommendations' in data && 'specific_examples' in data;
      });
      
      console.log('[GeminiService] Custom analysis completed');
      
      return {
        type: 'custom',
        analysisDate: new Date().toISOString(),
        ...analysisResult
      };
    } catch (error) {
      console.error('[GeminiService] Custom analysis error:', error);
      throw new Error(`Custom analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a chatbot response
   */
  async generateChatbotResponse(prompt: string): Promise<string> {
    try {
      console.log('[GeminiService] Generating chatbot response');
      
      const response = await this.makeAPICallWithRetry(async () => {
        const model = this.getCurrentModel();
        const result = await model.generateContent(prompt);
        return (await result.response).text();
      });
      
      console.log('[GeminiService] Chatbot response generated');
      return response;
    } catch (error) {
      console.error('[GeminiService] Chatbot error:', error);
      throw new Error(`Chatbot response generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fallback method to extract fields from malformed JSON
   */
  private extractFieldsFromMalformedJson(jsonStr: string): any {
    console.log('[GeminiService] Attempting to extract fields from malformed JSON');
    
    const result: any = {
      score: 0,
      summary: '',
      strengths: [],
      improvements: [],
      specific_examples: [],
      recommendations: []
    };

    const extractValue = (fieldName: string): string | null => {
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`);
      const match = jsonStr.match(regex);
      return match ? match[1] : null;
    };

    const extractNumber = (fieldName: string): number | null => {
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*(\\d+)`);
      const match = jsonStr.match(regex);
      return match ? parseInt(match[1], 10) : null;
    };

    const extractArray = (fieldName: string): string[] => {
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]*)\\]`);
      const match = jsonStr.match(regex);
      if (match && match[1]) {
        return match[1].split(',').map(s => s.replace(/"/g, '').trim()).filter(s => s);
      }
      return [];
    };

    result.score = extractNumber('score') || 0;
    result.summary = extractValue('summary') || `Could not extract summary. Raw: ${jsonStr.substring(0, 100)}...`;
    result.strengths = extractArray('strengths');
    result.improvements = extractArray('improvements');
    result.specific_examples = extractArray('specific_examples');
    result.recommendations = extractArray('recommendations');

    return result;
  }
}

export const geminiService = new GeminiAnalysisService();