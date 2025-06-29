import { GoogleGenerativeAI } from '@google/generative-ai';

// Round-robin API key management
class GeminiAPIKeyManager {
  private apiKeys: string[] = [];
  private currentIndex = 0;

  constructor() {
    this.loadAPIKeys();
  }

  private loadAPIKeys() {
    try {
      const apiKeysEnv = process.env.GOOGLE_GEMINI_API_KEYS;
      if (!apiKeysEnv) {
        console.warn('[GeminiAPIKeyManager] Warning: GOOGLE_GEMINI_API_KEYS not found in environment variables');
        return;
      }

      // Parse the JSON array from environment variable
      this.apiKeys = JSON.parse(apiKeysEnv);
      
      if (!Array.isArray(this.apiKeys) || this.apiKeys.length === 0) {
        console.warn('[GeminiAPIKeyManager] Warning: GOOGLE_GEMINI_API_KEYS should be a non-empty JSON array');
        this.apiKeys = [];
        return;
      }

      // Filter out invalid keys
      this.apiKeys = this.apiKeys.filter(key => key && typeof key === 'string' && key.trim().length > 0);
      
      if (this.apiKeys.length === 0) {
        console.warn('[GeminiAPIKeyManager] Warning: No valid API keys found in GOOGLE_GEMINI_API_KEYS');
      } else {
        console.log(`[GeminiAPIKeyManager] Loaded ${this.apiKeys.length} API key(s) for round-robin usage`);
      }
    } catch (error) {
      console.error('[GeminiAPIKeyManager] Error parsing GOOGLE_GEMINI_API_KEYS:', error);
      this.apiKeys = [];
    }
  }

  getCurrentAPIKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No valid Google Gemini API keys configured. Please update GOOGLE_GEMINI_API_KEYS in .env file with a JSON array of API keys.');
    }

    const currentKey = this.apiKeys[this.currentIndex];
    console.log(`[GeminiAPIKeyManager] Using API key ${this.currentIndex + 1}/${this.apiKeys.length} (${currentKey.substring(0, 10)}...)`);
    
    return currentKey;
  }

  getNextAPIKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('No valid Google Gemini API keys configured. Please update GOOGLE_GEMINI_API_KEYS in .env file with a JSON array of API keys.');
    }

    const currentKey = this.apiKeys[this.currentIndex];
    console.log(`[GeminiAPIKeyManager] Using API key ${this.currentIndex + 1}/${this.apiKeys.length} (${currentKey.substring(0, 10)}...)`);
    
    // Automatically rotate to next key for round-robin usage
    this.rotateToNextKey();
    
    return currentKey;
  }

  rotateToNextKey(): void {
    if (this.apiKeys.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
      console.log(`[GeminiAPIKeyManager] Rotated to API key ${this.currentIndex + 1}/${this.apiKeys.length} for next request`);
    }
  }

  getKeyCount(): number {
    return this.apiKeys.length;
  }
}

// Initialize the API key manager
const apiKeyManager = new GeminiAPIKeyManager();

// Default sales analysis parameters
export const DEFAULT_ANALYSIS_PARAMETERS = {
  'communication_skills': {
    name: 'Communication Skills',
    description: 'Analyze the salesperson\'s communication effectiveness',
    prompt: `Analyze the communication skills in this sales call recording. Evaluate:
    1. Clarity and articulation
    2. Active listening skills
    3. Professional tone and language
    4. Rapport building with the customer
    5. Overall communication effectiveness
    Provide a score from 1-10 and detailed feedback.`
  },
  'product_knowledge': {
    name: 'Product Knowledge',
    description: 'Evaluate the salesperson\'s product expertise',
    prompt: `Evaluate the product knowledge demonstrated in this sales call. Assess:
    1. Accuracy of product information provided
    2. Ability to answer customer questions
    3. Understanding of product benefits and features
    4. Confidence in product presentation
    5. Use of technical details appropriately
    Provide a score from 1-10 and specific examples.`
  },
  'customer_needs_analysis': {
    name: 'Customer Needs Analysis',
    description: 'Assess how well the salesperson identified and addressed customer needs',
    prompt: `Analyze how effectively the salesperson identified and addressed customer needs:
    1. Quality of discovery questions asked
    2. Understanding of customer pain points
    3. Alignment of solution with customer needs
    4. Personalization of the pitch
    5. Addressing customer objections
    Provide a score from 1-10 and recommendations.`
  },
  'closing_techniques': {
    name: 'Closing Techniques',
    description: 'Evaluate the effectiveness of closing and next steps',
    prompt: `Evaluate the closing techniques and next steps in this sales call:
    1. Natural progression to close
    2. Handling of objections during close
    3. Clear next steps defined
    4. Follow-up plan established
    5. Overall closing effectiveness
    Provide a score from 1-10 and improvement suggestions.`
  },
  'overall_performance': {
    name: 'Overall Performance',
    description: 'Comprehensive analysis of the entire sales call',
    prompt: `Provide a comprehensive analysis of this sales call including:
    1. Overall call structure and flow
    2. Achievement of call objectives
    3. Customer engagement level
    4. Professional presentation
    5. Areas of strength and improvement
    6. Likelihood of deal progression
    Provide an overall score from 1-10 and detailed recommendations.`
  },
  'emotional_intelligence': {
    name: 'Emotional Intelligence & Tone Analysis',
    description: 'Evaluate emotional awareness and tone management throughout the call',
    prompt: `Analyze the emotional intelligence and tone management in this sales call:
    1. Emotional awareness and empathy demonstrated
    2. Tone consistency and appropriateness
    3. Ability to read and respond to customer emotions
    4. Management of difficult or tense moments
    5. Building emotional connection with the customer
    6. Sentiment progression throughout the conversation
    7. Professional composure under pressure
    Provide a score from 1-10 and specific examples of emotional intelligence in action.`
  }
};

export class GeminiAnalysisService {
  private getCurrentModel() {
    // Get next API key in round-robin fashion and create a new client
    const currentApiKey = apiKeyManager.getNextAPIKey();
    const genAI = new GoogleGenerativeAI(currentApiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private async makeAPICallWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = apiKeyManager.getKeyCount()
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[GeminiService] API call attempt ${attempt + 1}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`[GeminiService] API call failed on attempt ${attempt + 1}:`, error);
        
        // Check if it's a rate limit or quota error that might benefit from key rotation
        if (error instanceof Error && (
          error.message.includes('QUOTA_EXCEEDED') ||
          error.message.includes('RATE_LIMIT_EXCEEDED') ||
          error.message.includes('429') ||
          error.message.includes('Too Many Requests')
        )) {
          console.log('[GeminiService] Rate limit detected, will try next API key...');
          
          // Add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (attempt === maxRetries - 1) {
          // Don't retry for non-rate-limit errors on the last attempt
          break;
        } else {
          // For other errors, add a small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    throw lastError || new Error('All API calls failed');
  }

  constructor() {
    console.log(`[GeminiService] Initialized with ${apiKeyManager.getKeyCount()} API key(s) and gemini-2.5-flash model`);
  }

  /**
   * Transcribe audio content using Gemini API
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    console.log(`[GeminiService] Starting audio transcription, size: ${audioBuffer.length} bytes`);
    
    const base64Audio = audioBuffer.toString('base64');
    const prompt = `Please transcribe this audio file with the following requirements:
1.  **Speaker Diarization**: Identify and label each speaker (e.g., "Speaker 1", "Speaker 2").
2.  **Transcription**: Provide a verbatim transcription of the conversation.
3.  **Timestamps**: Include start and end times for each speaker segment.
4.  **Translation**: If the original language is not English, provide an English translation of the transcription.
5.  **Language Identification**: Identify the original language of the conversation.
6.  **Tone Analysis**: Analyze the tone of each speaker segment (e.g., "professional", "friendly", "aggressive", "uncertain", "confident", "frustrated", "enthusiastic", "calm").
7.  **Sentiment Analysis**: Determine the sentiment of each speaker segment (e.g., "positive", "negative", "neutral", "mixed").

Return the result in a JSON object with the following structure:
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
  "english_translation": [
    { 
      "speaker": "<speaker_label>", 
      "text": "<translated_text>", 
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
}

If the original language is English, the "english_translation" field should be the same as "diarized_transcription".`;
    
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
      
      console.log(`[GeminiService] Transcription completed, length: ${transcription.length} characters`);
      
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
        english_translation: [{ 
          speaker: "unknown", 
          text: "Translation not available",
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
      
      const results: any = {};
      const enabledParameters = parameters.filter(p => p.enabled);
      
      for (const parameter of enabledParameters) {
        console.log(`[GeminiService] Analyzing: ${parameter.name}`);
        
        const prompt = `${parameter.prompt}

Sales Call Transcription:
${transcription}

Please provide your analysis in the following JSON format:
{
  "score": <number from 1-10>,
  "summary": "<brief summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "specific_examples": ["<example 1>", "<example 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;

        const analysisText = await this.makeAPICallWithRetry(async () => {
          const model = this.getCurrentModel();
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });
        
        try {
          // Extract JSON from response
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            results[parameter.id] = JSON.parse(jsonMatch[0]);
          } else {
            results[parameter.id] = {
              score: 0,
              summary: analysisText,
              strengths: [],
              improvements: [],
              specific_examples: [],
              recommendations: []
            };
          }
        } catch (parseError) {
          console.error(`[GeminiService] JSON parse error for ${parameter.name}:`, parseError);
          results[parameter.id] = {
            score: 0,
            summary: analysisText,
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
      
      console.log('[GeminiService] Custom parameters analysis completed');
      
      return {
        type: 'parameters',
        overallScore,
        analysisDate: new Date().toISOString(),
        parameters: results,
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
      
      for (const [key, parameter] of Object.entries(DEFAULT_ANALYSIS_PARAMETERS)) {
        console.log(`[GeminiService] Analyzing: ${parameter.name}`);
        
        const prompt = `${parameter.prompt}

Sales Call Transcription:
${transcription}

Please provide your analysis in the following JSON format:
{
  "score": <number from 1-10>,
  "summary": "<brief summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "specific_examples": ["<example 1>", "<example 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"]
}`;

        const analysisText = await this.makeAPICallWithRetry(async () => {
          const model = this.getCurrentModel();
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        });
        
        try {
          // Extract JSON from response
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            results[key] = JSON.parse(jsonMatch[0]);
          } else {
            results[key] = {
              score: 0,
              summary: analysisText,
              strengths: [],
              improvements: [],
              specific_examples: [],
              recommendations: []
            };
          }
        } catch (parseError) {
          console.error(`[GeminiService] JSON parse error for ${key}:`, parseError);
          results[key] = {
            score: 0,
            summary: analysisText,
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
        parameters: results
      };
    } catch (error) {
      console.error('[GeminiService] Default analysis error:', error);
      throw new Error(`Sales analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

Please provide a comprehensive analysis based on the instructions above. Format your response as JSON with the following structure:
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

      const analysisText = await this.makeAPICallWithRetry(async () => {
        const model = this.getCurrentModel();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      });
      
      let analysisResult;
      try {
        // Extract JSON from response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          analysisResult = {
            summary: analysisText,
            key_findings: [],
            scores: {},
            recommendations: [],
            specific_examples: []
          };
        }
      } catch (parseError) {
        console.error('[GeminiService] Custom analysis JSON parse error:', parseError);
        analysisResult = {
          summary: analysisText,
          key_findings: [],
          scores: {},
          recommendations: [],
          specific_examples: []
        };
      }
      
      // Calculate overall score from individual scores if available
      const scores = Object.values(analysisResult.scores || {}).filter(s => typeof s === 'number');
      const overallScore = scores.length > 0 ? Math.round(scores.reduce((a: any, b: any) => a + b, 0) / scores.length) : 0;
      
      console.log('[GeminiService] Custom analysis completed');
      
      return {
        type: 'custom',
        overallScore,
        analysisDate: new Date().toISOString(),
        customPrompt,
        result: analysisResult
      };
    } catch (error) {
      console.error('[GeminiService] Custom analysis error:', error);
      throw new Error(`Custom analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate chatbot response using Gemini API
   */
  async generateChatbotResponse(prompt: string): Promise<string> {
    console.log('[GeminiService] Starting chatbot response generation');
    
    try {
      const response = await this.makeAPICallWithRetry(async () => {
        const model = this.getCurrentModel();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      });
      
      console.log(`[GeminiService] Chatbot response generated, length: ${response.length} characters`);
      return response;
    } catch (error) {
      console.error('[GeminiService] Chatbot response error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new Error('Invalid Google Gemini API key. Please check your GOOGLE_GEMINI_API_KEYS in the .env file.');
        }
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Google Gemini API key is invalid. Please update GOOGLE_GEMINI_API_KEYS in your .env file.');
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied for Google Gemini API. Please check your API key permissions and quotas.');
        }
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Google Gemini API quota exceeded. All configured API keys have reached their limits.');
        }
      }
      
      throw new Error(`Chatbot response failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const geminiService = new GeminiAnalysisService();