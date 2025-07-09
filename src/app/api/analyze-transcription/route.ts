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

    // Generate analysis using Gemini - use direct text response with short format
    const prompt = `You are an expert sales and communication analyst. Analyze the following call transcription(s) and answer the specific question with a SHORT, focused response.

TRANSCRIPTION(S):
${transcriptionForAnalysis}

QUESTION TO ANSWER:
${customPrompt}

INSTRUCTIONS:
- Keep your response BRIEF and CONCISE (2-3 sentences maximum)
- Focus on the most important insights from the actual conversation
- Provide direct answers based on what was said in the transcription(s)
- Include specific examples or quotes when relevant
- Give actionable recommendations in a few words
- Avoid lengthy explanations or excessive detail

Format your response as plain text, keeping it under 100 words.`;

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
