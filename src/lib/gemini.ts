import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

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
  }
};

export class GeminiAnalysisService {
  private model;

  constructor() {
    // Check if API key is configured
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === 'your_actual_google_gemini_api_key_here') {
      console.warn('[GeminiService] Warning: Google Gemini API key not configured. Please update GOOGLE_GEMINI_API_KEY in .env file.');
    }
    
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  /**
   * Transcribe audio content using Gemini API
   */
  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      console.log(`[GeminiService] Starting audio transcription, size: ${audioBuffer.length} bytes`);
      
      const base64Audio = audioBuffer.toString('base64');
      
      const prompt = "Please transcribe this audio file accurately. Focus on capturing all spoken words, including any sales conversation, questions, and responses.";
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;
      const transcription = response.text();
      
      console.log(`[GeminiService] Transcription completed, length: ${transcription.length} characters`);
      return transcription;
    } catch (error) {
      console.error('[GeminiService] Transcription error:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
          throw new Error('Invalid Google Gemini API key. Please check your GOOGLE_GEMINI_API_KEY in the .env file. Visit https://aistudio.google.com/ to get a valid API key.');
        }
        if (error.message.includes('API_KEY_INVALID')) {
          throw new Error('Google Gemini API key is invalid. Please update GOOGLE_GEMINI_API_KEY in your .env file with a valid key from https://aistudio.google.com/');
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Permission denied for Google Gemini API. Please check your API key permissions and quotas.');
        }
        if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Google Gemini API quota exceeded. Please check your usage limits in Google AI Studio.');
        }
      }
      
      throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const analysisText = response.text();
        
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

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();
      
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
}

export const geminiService = new GeminiAnalysisService();