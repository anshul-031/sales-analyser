import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini';
import { Logger } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { transcription, customPrompt, recordingIds } = await request.json();

    if (!transcription || !customPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing transcription or custom prompt'
        },
        { status: 400 }
      );
    }

    Logger.info(
      '[AnalyzeTranscription] Starting custom analysis for',
      recordingIds?.length || 0,
      'recordings'
    );

    let transcriptionForAnalysis = transcription;
    try {
      const transcriptionData = JSON.parse(transcription);
      if (transcriptionData && Array.isArray(transcriptionData.diarized_transcription)) {
        // Use english_translation if it exists, otherwise use diarized_transcription
        const transcriptionSource = transcriptionData.english_translation || transcriptionData.diarized_transcription;
        transcriptionForAnalysis = transcriptionSource
          .map((t: { speaker: string; text: string }) => `${t.speaker}: ${t.text}`)
          .join('\n');
      }
    } catch (e) {
      // Ignore parsing errors, use transcription as is (for backward compatibility)
      Logger.warn('[AnalyzeTranscription] Transcription is not a valid JSON, using as plain text.');
    }

    // Generate analysis using Gemini - use direct text response
    const prompt = `You are an expert sales and communication analyst. Please analyze the following call transcription(s) and answer the specific question asked.

TRANSCRIPTION(S):
${transcriptionForAnalysis}

QUESTION TO ANSWER:
${customPrompt}

Please provide a comprehensive, insightful analysis that directly addresses the question. Focus on:
- Direct answers to the specific question asked
- Key insights and patterns
- Actionable recommendations
- Specific examples from the transcription(s) when relevant

Format your response in a clear, structured manner as plain text.`;

    const analysisText = await geminiService.generateChatbotResponse(prompt);

    Logger.info('[AnalyzeTranscription] Analysis completed successfully');

    return NextResponse.json({
      success: true,
      analysis: analysisText,
      metadata: {
        recordingCount: recordingIds?.length || 0,
        prompt: customPrompt,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    Logger.error('[AnalyzeTranscription] Error during analysis:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      { status: 500 }
    );
  }
}
