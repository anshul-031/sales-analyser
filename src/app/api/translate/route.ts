import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

// Import the API key manager instance (not exported directly, so we'll access it differently)
// Let's use the geminiService instead to maintain consistency
import { geminiService } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { text, targetLanguage, sourceLanguage = 'auto' } = await request.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { success: false, error: 'Text and target language are required' },
        { status: 400 }
      );
    }

    console.log('[Translation] Translating text to:', targetLanguage);
    console.log('[Translation] Text length:', text.length);

    const prompt = `Please translate the following text to ${getLanguageName(targetLanguage)}. 
    Maintain the same format and structure. If the text contains speaker labels (like "Speaker 1:", "Speaker 2:"), keep them intact.
    Only return the translated text, no additional commentary or explanation.

    Text to translate:
    ${text}`;

    // Use the existing geminiService to make the API call
    const translatedText = await geminiService.generateChatbotResponse(prompt);
    
    console.log('[Translation] Translation completed successfully');
    
    return NextResponse.json({
      success: true,
      translatedText,
      sourceLanguage,
      targetLanguage,
    });

  } catch (error) {
    console.error('[Translation] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Translation failed' },
      { status: 500 }
    );
  }
}

function getLanguageName(code: string): string {
  const languageMap: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'te': 'Telugu',
    'mr': 'Marathi',
    'ta': 'Tamil',
    'ur': 'Urdu',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi'
  };
  
  return languageMap[code] || code;
}
